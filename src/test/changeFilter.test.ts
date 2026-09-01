import { describe, expect, it } from 'vitest'
import { ChangeGroup, ChangeStatus, type SpectraChange } from '../discovery/model'
import { matchesFilter, applyFilter } from '../view/changeFilter'

function change(name: string, artifacts: string[] = [], proposer?: string): SpectraChange {
  return {
    name,
    group: ChangeGroup.Active,
    path: `/tmp/${name}`,
    artifacts,
    status: ChangeStatus.Draft,
    proposer,
  }
}

describe('Filter changes by name', () => {
  it('matches a change whose name contains the filter text', () => {
    expect(matchesFilter(change('add-search'), 'search')).toBe(true)
    expect(matchesFilter(change('mid-tier'), 'search')).toBe(false)
  })

  it('compares case-insensitively', () => {
    // The spec's "Filtering is case-insensitive" scenario.
    expect(matchesFilter(change('add-search'), 'SEARCH')).toBe(true)
    expect(matchesFilter(change('ADD-SEARCH'), 'search')).toBe(true)
  })

  it('never matches against artifact paths', () => {
    // The spec's "Artifact paths are not matched" scenario.
    const changes = [change('add-search', ['proposal.md']), change('mid-tier', ['proposal.md'])]

    expect(applyFilter(changes, 'proposal')).toEqual([])
  })

  it('never matches against the proposer', () => {
    expect(matchesFilter(change('add-dark-mode', [], 'fripig'), 'fripig')).toBe(false)
  })

  it('returns the whole list when the filter text is empty', () => {
    const changes = [change('add-search'), change('mid-tier')]

    expect(applyFilter(changes, '')).toEqual(changes)
    expect(applyFilter(changes, '   ')).toEqual(changes)
  })

  it('narrows a list to the matching changes, keeping their order', () => {
    const changes = [change('zebra-fix'), change('add-search'), change('search-cache')]

    expect(applyFilter(changes, 'search').map((c) => c.name)).toEqual([
      'add-search',
      'search-cache',
    ])
  })

  it('returns nothing when no name contains the filter text', () => {
    expect(applyFilter([change('add-search'), change('mid-tier')], 'nonexistent')).toEqual([])
  })
})
