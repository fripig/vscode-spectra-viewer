import { describe, expect, it } from 'vitest'
import { ChangeGroup, ChangeStatus, type ChangeSnapshot, type SpectraChange } from '../discovery/model'
import { ChangeOrder } from '../view/changeOrder'
import {
  ARTIFACT_ICON,
  GROUP_ICON,
  childrenOf,
  nodeDescription,
  nodeId,
  progressDescription,
  rootNodes,
  statusIcon,
  type ChangeNode,
  type GroupNode,
} from '../view/nodes'

function change(name: string, group = ChangeGroup.Active, artifacts: string[] = []): SpectraChange {
  return { name, group, path: `/tmp/${name}`, artifacts, status: ChangeStatus.Draft }
}

function snapshot(parts: Partial<Record<ChangeGroup, SpectraChange[]>> = {}): ChangeSnapshot {
  return {
    [ChangeGroup.Active]: parts[ChangeGroup.Active] ?? [],
    [ChangeGroup.Parked]: parts[ChangeGroup.Parked] ?? [],
    [ChangeGroup.Archived]: parts[ChangeGroup.Archived] ?? [],
  }
}

describe('Display changes as a grouped tree', () => {
  it('always shows exactly three group nodes, in a fixed order', () => {
    const groups = rootNodes(snapshot())

    expect(groups.map((g) => g.label)).toEqual(['Active', 'Parked', 'Archived'])
    expect(groups.map((g) => g.group)).toEqual([
      ChangeGroup.Active,
      ChangeGroup.Parked,
      ChangeGroup.Archived,
    ])
  })

  it('shows each group its change count, including zero', () => {
    // The spec's "Groups render with counts" scenario.
    const groups = rootNodes(
      snapshot({
        [ChangeGroup.Active]: [change('add-search'), change('mid-tier')],
        [ChangeGroup.Parked]: [change('dark-mode', ChangeGroup.Parked)],
      }),
    )

    expect(groups.map((g) => g.count)).toEqual([2, 1, 0])
  })

  it('keeps a parked change visible under the Parked group', () => {
    const parked = change('dark-mode', ChangeGroup.Parked)
    const groups = rootNodes(snapshot({ [ChangeGroup.Parked]: [parked] }))
    const children = childrenOf(groups[1]!) as ChangeNode[]

    expect(children.map((c) => c.change.name)).toEqual(['dark-mode'])
  })

  it('lists the Markdown artifacts of a change beneath it', () => {
    const withArtifacts = change('add-search', ChangeGroup.Active, [
      'proposal.md',
      'specs/theme-engine/spec.md',
    ])
    const [group] = rootNodes(snapshot({ [ChangeGroup.Active]: [withArtifacts] }))
    const [changeNode] = childrenOf(group!) as ChangeNode[]

    expect(childrenOf(changeNode!).map((n) => n.label)).toEqual([
      'proposal.md',
      'specs/theme-engine/spec.md',
    ])
  })

  it('gives artifact nodes no children of their own', () => {
    const [group] = rootNodes(
      snapshot({ [ChangeGroup.Active]: [change('add-search', ChangeGroup.Active, ['proposal.md'])] }),
    )
    const [changeNode] = childrenOf(group!) as ChangeNode[]
    const [artifact] = childrenOf(changeNode!)

    expect(childrenOf(artifact!)).toEqual([])
  })
})

describe('Show task progress on change nodes', () => {
  it('shows both counts when progress information exists', () => {
    // The spec's "Change with tasks" scenario: 3 of 8.
    const withProgress: SpectraChange = {
      ...change('add-search'),
      progress: { complete: 3, total: 8 },
      status: ChangeStatus.InProgress,
    }

    const description = progressDescription(withProgress)

    expect(description).toBeDefined()
    expect(description).toContain('3')
    expect(description).toContain('8')
  })

  it('shows no description at all when progress information is absent', () => {
    expect(progressDescription(change('add-search'))).toBeUndefined()
  })
})

describe('Show change status as the node icon', () => {
  const statuses = [
    ChangeStatus.Draft,
    ChangeStatus.NotStarted,
    ChangeStatus.InProgress,
    ChangeStatus.Complete,
  ]

  it('maps each of the four statuses to a distinct icon', () => {
    const icons = statuses.map(statusIcon)

    expect(new Set(icons).size).toBe(4)
    for (const icon of icons) {
      expect(icon).not.toBe('')
    }
  })

  it('gives two changes of the same status the same icon', () => {
    expect(statusIcon(ChangeStatus.InProgress)).toBe(statusIcon(ChangeStatus.InProgress))
  })

  it('keeps group and artifact icons clear of the four status icons', () => {
    const statusIcons = new Set(statuses.map(statusIcon))

    expect(statusIcons).not.toContain(GROUP_ICON)
    expect(statusIcons).not.toContain(ARTIFACT_ICON)
  })
})

describe('給每個節點穩定識別碼，讓 refresh 保留展開狀態', () => {
  const fullSnapshot = (): ChangeSnapshot =>
    snapshot({
      [ChangeGroup.Active]: [change('add-search', ChangeGroup.Active, ['proposal.md', 'tasks.md'])],
      [ChangeGroup.Parked]: [change('add-search', ChangeGroup.Parked, ['proposal.md'])],
      [ChangeGroup.Archived]: [change('old-login', ChangeGroup.Archived, [])],
    })

  const allIds = (snap: ChangeSnapshot): string[] => {
    const ids: string[] = []
    for (const group of rootNodes(snap)) {
      ids.push(nodeId(group))
      for (const changeNode of childrenOf(group)) {
        ids.push(nodeId(changeNode))
        for (const artifact of childrenOf(changeNode)) {
          ids.push(nodeId(artifact))
        }
      }
    }
    return ids
  }

  it('gives every node in the tree a unique id', () => {
    const ids = allIds(fullSnapshot())

    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('keeps the same id for the same logical node across two scans', () => {
    expect(allIds(fullSnapshot())).toEqual(allIds(fullSnapshot()))
  })

  it('does not collide when the same change name appears in two groups', () => {
    const active = rootNodes(fullSnapshot())[0]!
    const parked = rootNodes(fullSnapshot())[1]!

    expect(nodeId(childrenOf(active)[0]!)).not.toBe(nodeId(childrenOf(parked)[0]!))
  })

  it('keeps a change id stable when its progress changes', () => {
    const before = change('add-search')
    const after: SpectraChange = { ...before, progress: { complete: 1, total: 2 } }
    const idOf = (c: SpectraChange): string =>
      nodeId(childrenOf(rootNodes(snapshot({ [ChangeGroup.Active]: [c] }))[0]!)[0]!)

    expect(idOf(before)).toBe(idOf(after))
  })
})

describe('Show the proposer on change nodes', () => {
  const withMeta = (
    name: string,
    proposer?: string,
    progress?: { complete: number; total: number },
  ): SpectraChange => ({ ...change(name), proposer, progress })

  // One row per line of the spec's "node text by proposer and progress" table.
  const rows = [
    { proposer: 'fripig', progress: { complete: 3, total: 8 }, expected: 'fripig 3/8' },
    { proposer: undefined, progress: { complete: 3, total: 8 }, expected: '3/8' },
    { proposer: 'fripig', progress: undefined, expected: 'fripig' },
    { proposer: undefined, progress: undefined, expected: undefined },
  ]

  it.each(rows)('proposer=$proposer progress=$progress', ({ proposer, progress, expected }) => {
    expect(nodeDescription(withMeta('add-dark-mode', proposer, progress))).toBe(expected)
  })

  it('puts the proposer between the name and the counts, with counts last', () => {
    const description = nodeDescription(withMeta('add-dark-mode', 'fripig', { complete: 3, total: 8 }))!

    expect(description.indexOf('fripig')).toBeLessThan(description.indexOf('3/8'))
    expect(description.endsWith('3/8')).toBe(true)
  })

  it('keeps the counts in the same trailing position whatever the proposer length', () => {
    const short = nodeDescription(withMeta('c', 'al', { complete: 3, total: 8 }))!
    const long = nodeDescription(withMeta('c', 'a-very-long-proposer-name', { complete: 3, total: 8 }))!

    expect(short.endsWith('3/8')).toBe(true)
    expect(long.endsWith('3/8')).toBe(true)
  })

  it('shows the proposer in every group', () => {
    for (const group of [ChangeGroup.Active, ChangeGroup.Parked, ChangeGroup.Archived]) {
      const c: SpectraChange = { ...change('add-dark-mode', group), proposer: 'fripig' }
      expect(nodeDescription(c)).toContain('fripig')
    }
  })

  it('leaves no placeholder text when the proposer is unknown', () => {
    expect(nodeDescription(withMeta('add-dark-mode', undefined, { complete: 3, total: 8 }))).toBe('3/8')
  })
})

describe('Sort changes within groups — tree rebuild', () => {
  const dated = (name: string, created?: string, modified?: string): SpectraChange => ({
    ...change(name),
    created: created === undefined ? undefined : new Date(created),
    modified: modified === undefined ? undefined : new Date(modified),
  })

  /** The spec's three-change example. */
  const active = (): SpectraChange[] => [
    dated('add-search', '2026-08-10T00:00:00Z', '2026-08-12T09:00:00Z'),
    dated('mid-tier', '2026-08-12T00:00:00Z', '2026-08-11T17:00:00Z'),
    dated('zebra-fix', undefined, '2026-08-13T08:00:00Z'),
  ]

  const namesUnder = (group: GroupNode, by: ChangeOrder): string[] =>
    (childrenOf(group, by) as ChangeNode[]).map((c) => c.change.name)

  it('reorders each group according to the selected option', () => {
    const [group] = rootNodes(snapshot({ [ChangeGroup.Active]: active() }))

    expect(namesUnder(group!, ChangeOrder.Name)).toEqual(['add-search', 'mid-tier', 'zebra-fix'])
    expect(namesUnder(group!, ChangeOrder.Modified)).toEqual(['zebra-fix', 'add-search', 'mid-tier'])
    expect(namesUnder(group!, ChangeOrder.Created)).toEqual(['mid-tier', 'add-search', 'zebra-fix'])
  })

  it('defaults to Modified when no option is given', () => {
    const [group] = rootNodes(snapshot({ [ChangeGroup.Active]: active() }))

    expect((childrenOf(group!) as ChangeNode[]).map((c) => c.change.name)).toEqual([
      'zebra-fix',
      'add-search',
      'mid-tier',
    ])
  })

  it('never reorders the three groups themselves', () => {
    for (const by of [ChangeOrder.Name, ChangeOrder.Modified, ChangeOrder.Created]) {
      const groups = rootNodes(snapshot({ [ChangeGroup.Active]: active() }))
      expect(groups.map((g) => g.label)).toEqual(['Active', 'Parked', 'Archived'])
      // The order argument must not leak into the group level.
      expect(namesUnder(groups[0]!, by).length).toBe(3)
    }
  })

  it('keeps node ids stable across a sort change', () => {
    const [group] = rootNodes(snapshot({ [ChangeGroup.Active]: active() }))
    const idsFor = (by: ChangeOrder): string[] =>
      (childrenOf(group!, by) as ChangeNode[]).map(nodeId).sort()

    expect(idsFor(ChangeOrder.Name)).toEqual(idsFor(ChangeOrder.Created))
  })
})
