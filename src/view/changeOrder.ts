/**
 * How change nodes are ordered inside a group.
 *
 * Discovery leaves order unspecified on purpose, so every rule lives here —
 * and, like the rest of the node model, this module imports nothing from
 * `vscode` so the rules stay unit-testable in plain Node.
 */
import type { SpectraChange } from '../discovery/model'

export enum ChangeOrder {
  Name = 'name',
  Modified = 'modified',
  Created = 'created',
}

/** Modified surfaces whatever was touched last, which is usually what you want. */
export const DEFAULT_ORDER = ChangeOrder.Modified

function byName(a: SpectraChange, b: SpectraChange): number {
  const left = a.name.toLowerCase()
  const right = b.name.toLowerCase()
  if (left < right) return -1
  if (left > right) return 1
  // Same name ignoring case: fall back to the raw name so the order is total.
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
}

/**
 * Newest first, with one deliberate asymmetry: a change whose date is unknown
 * sorts last whichever way the dates run, so a batch of changes with no
 * metadata never squats at the top of the list.
 */
function byDateDescending(
  a: SpectraChange,
  b: SpectraChange,
  pick: (change: SpectraChange) => Date | undefined,
): number {
  const left = pick(a)?.getTime()
  const right = pick(b)?.getTime()

  if (left === undefined && right === undefined) return byName(a, b)
  if (left === undefined) return 1
  if (right === undefined) return -1
  if (left === right) return byName(a, b)
  return right - left
}

export function comparatorFor(order: ChangeOrder): (a: SpectraChange, b: SpectraChange) => number {
  switch (order) {
    case ChangeOrder.Name:
      return byName
    case ChangeOrder.Modified:
      return (a, b) => byDateDescending(a, b, (c) => c.modified)
    case ChangeOrder.Created:
      return (a, b) => byDateDescending(a, b, (c) => c.created)
  }
}
