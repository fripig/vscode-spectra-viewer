import { describe, expect, it } from 'vitest'
import { ChangeGroup, ChangeStatus, type SpectraChange } from '../discovery/model'
import { ChangeOrder, DEFAULT_ORDER, comparatorFor } from '../view/changeOrder'

function change(
  name: string,
  created?: string,
  modified?: string,
): SpectraChange {
  return {
    name,
    group: ChangeGroup.Active,
    path: `/tmp/${name}`,
    artifacts: [],
    status: ChangeStatus.Draft,
    created: created === undefined ? undefined : new Date(created),
    modified: modified === undefined ? undefined : new Date(modified),
  }
}

/** The three changes from the spec's "three changes under each sort option" example. */
const example = (): SpectraChange[] => [
  change('add-search', '2026-08-10T00:00:00Z', '2026-08-12T09:00:00Z'),
  change('mid-tier', '2026-08-12T00:00:00Z', '2026-08-11T17:00:00Z'),
  change('zebra-fix', undefined, '2026-08-13T08:00:00Z'),
]

const order = (changes: SpectraChange[], by: ChangeOrder): string[] =>
  [...changes].sort(comparatorFor(by)).map((c) => c.name)

describe('Sort changes within groups', () => {
  it('orders by name ascending', () => {
    expect(order(example(), ChangeOrder.Name)).toEqual(['add-search', 'mid-tier', 'zebra-fix'])
  })

  it('orders by modification date, most recent first', () => {
    expect(order(example(), ChangeOrder.Modified)).toEqual(['zebra-fix', 'add-search', 'mid-tier'])
  })

  it('orders by creation date, most recent first', () => {
    expect(order(example(), ChangeOrder.Created)).toEqual(['mid-tier', 'add-search', 'zebra-fix'])
  })

  it('compares names case-insensitively', () => {
    // The spec's case-insensitive example, with its exact names.
    const mixed = [change('Zebra-fix'), change('add-search'), change('Mid-tier')]

    expect(order(mixed, ChangeOrder.Name)).toEqual(['add-search', 'Mid-tier', 'Zebra-fix'])
  })

  it('offers exactly three mutually exclusive options', () => {
    expect(Object.values(ChangeOrder)).toHaveLength(3)
    expect(new Set(Object.values(ChangeOrder)).size).toBe(3)
  })
})

describe('Sort changes within groups — shared date rules', () => {
  it('places every change with a creation date before every change without one', () => {
    const changes = [
      change('a-unknown'),
      change('b-dated', '2026-08-10T00:00:00Z'),
      change('c-unknown'),
      change('d-dated', '2026-08-12T00:00:00Z'),
    ]

    const names = order(changes, ChangeOrder.Created)

    expect(names.slice(0, 2)).toEqual(['d-dated', 'b-dated'])
    expect(names.slice(2).sort()).toEqual(['a-unknown', 'c-unknown'])
  })

  it('places every change with a modification date before every change without one', () => {
    const changes = [
      change('a-unknown'),
      change('b-dated', undefined, '2026-08-10T00:00:00Z'),
      change('c-unknown'),
    ]

    expect(order(changes, ChangeOrder.Modified)[0]).toBe('b-dated')
  })

  it('falls back to name order for changes sharing a creation date', () => {
    // The spec's "Changes sharing a date fall back to name order" scenario.
    const changes = [
      change('zebra-fix', '2026-08-10T00:00:00Z'),
      change('add-search', '2026-08-10T00:00:00Z'),
    ]

    expect(order(changes, ChangeOrder.Created)).toEqual(['add-search', 'zebra-fix'])
  })

  it('falls back to name order for changes sharing a modification date', () => {
    const changes = [
      change('zebra-fix', undefined, '2026-08-10T00:00:00Z'),
      change('add-search', undefined, '2026-08-10T00:00:00Z'),
    ]

    expect(order(changes, ChangeOrder.Modified)).toEqual(['add-search', 'zebra-fix'])
  })

  it('orders two changes that both lack a date by name', () => {
    expect(order([change('zebra-fix'), change('add-search')], ChangeOrder.Created)).toEqual([
      'add-search',
      'zebra-fix',
    ])
  })

  it('defaults to Modified', () => {
    expect(DEFAULT_ORDER).toBe(ChangeOrder.Modified)
  })
})
