/**
 * Turning a tree selection into something useful.
 *
 * Both rules here ignore group and artifact nodes rather than treating them
 * as an error: a user rubber-banding a selection picks them up incidentally,
 * and refusing to act would be more annoying than doing the obvious thing.
 */
import type { SpectraChange } from '../discovery/model'
import type { SpectraNode } from './nodes'

function changesIn(selection: readonly SpectraNode[]): SpectraChange[] {
  return selection.filter((node) => node.kind === 'change').map((node) => node.change)
}

/**
 * The clipboard text for a selection, or `undefined` when nothing should be
 * written — leaving whatever the user already had on the clipboard alone.
 *
 * The names only: never the group, the proposer, or the progress counts, all
 * of which are decoration added by the view.
 */
export function copyText(selection: readonly SpectraNode[]): string | undefined {
  const names = changesIn(selection).map((change) => change.name)
  return names.length === 0 ? undefined : names.join('\n')
}

/**
 * The single selected change, or `undefined` when there is not exactly one.
 *
 * A slash command takes one change name, so two selected changes have no
 * sensible answer — unlike a copy, where several names are a fine clipboard.
 */
export function soleChange(selection: readonly SpectraNode[]): SpectraChange | undefined {
  const changes = changesIn(selection)
  return changes.length === 1 ? changes[0] : undefined
}
