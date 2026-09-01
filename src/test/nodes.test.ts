import { describe, expect, it } from 'vitest'
import { ChangeGroup, ChangeStatus, type ChangeSnapshot, type SpectraChange } from '../discovery/model'
import {
  ARTIFACT_ICON,
  GROUP_ICON,
  childrenOf,
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

describe('Order changes by name within groups', () => {
  const orderIn = (group: GroupNode): string[] =>
    (childrenOf(group) as ChangeNode[]).map((c) => c.change.name)

  it('lists changes alphabetically regardless of snapshot order', () => {
    const [active] = rootNodes(
      snapshot({
        [ChangeGroup.Active]: [change('zebra-fix'), change('add-search'), change('mid-tier')],
      }),
    )

    expect(orderIn(active!)).toEqual(['add-search', 'mid-tier', 'zebra-fix'])
  })

  it('compares names case-insensitively', () => {
    // The spec's "case-insensitive ordering" example, with its exact names.
    const [active] = rootNodes(
      snapshot({
        [ChangeGroup.Active]: [change('Zebra-fix'), change('add-search'), change('Mid-tier')],
      }),
    )

    expect(orderIn(active!)).toEqual(['add-search', 'Mid-tier', 'Zebra-fix'])
  })

  it('does not reorder the three groups themselves', () => {
    const groups = rootNodes(
      snapshot({
        [ChangeGroup.Archived]: [change('old-login', ChangeGroup.Archived)],
        [ChangeGroup.Parked]: [change('dark-mode', ChangeGroup.Parked)],
      }),
    )

    expect(groups.map((g) => g.label)).toEqual(['Active', 'Parked', 'Archived'])
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
