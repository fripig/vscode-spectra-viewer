import { describe, expect, it } from 'vitest'
import { ChangeGroup, ChangeStatus, type SpectraChange } from '../discovery/model'
import { copyText, soleChange } from '../view/copySelection'
import type { ArtifactNode, ChangeNode, GroupNode, SpectraNode } from '../view/nodes'

function makeChange(name: string, proposer?: string): SpectraChange {
  return {
    name,
    group: ChangeGroup.Active,
    path: `/tmp/${name}`,
    artifacts: [],
    status: ChangeStatus.InProgress,
    proposer,
    progress: { complete: 3, total: 7 },
  }
}

const changeNode = (name: string, proposer?: string): ChangeNode => ({
  kind: 'change',
  label: name,
  change: makeChange(name, proposer),
})

const groupNode: GroupNode = {
  kind: 'group',
  group: ChangeGroup.Active,
  label: 'Active',
  matched: 1,
  total: 1,
  filtered: false,
  changes: [],
}

const artifactNode: ArtifactNode = {
  kind: 'artifact',
  label: 'design.md',
  changePath: '/tmp/add-search',
  changeName: 'add-search',
  group: ChangeGroup.Active,
  relativePath: 'design.md',
}

describe('Copy change names to the clipboard', () => {
  // One row per line of the spec's "selections and their clipboard contents" table.
  const rows: Array<{ label: string; selection: SpectraNode[]; expected: string | undefined }> = [
    { label: 'change add-search', selection: [changeNode('add-search')], expected: 'add-search' },
    {
      label: 'changes add-search, zebra-fix',
      selection: [changeNode('add-search'), changeNode('zebra-fix')],
      expected: 'add-search\nzebra-fix',
    },
    { label: 'group Active', selection: [groupNode], expected: undefined },
    { label: 'artifact design.md', selection: [artifactNode], expected: undefined },
    {
      label: 'group, change and artifact',
      selection: [groupNode, changeNode('add-search'), artifactNode],
      expected: 'add-search',
    },
    { label: 'nothing selected', selection: [], expected: undefined },
  ]

  it.each(rows)('$label', ({ selection, expected }) => {
    expect(copyText(selection)).toBe(expected)
  })

  it('copies the name alone, without proposer or progress counts', () => {
    // The spec's "Copy a single change name" scenario: proposer fripig, 3 of 7.
    expect(copyText([changeNode('add-search', 'fripig')])).toBe('add-search')
  })

  it('separates several names with a single newline, in selection order', () => {
    const text = copyText([changeNode('add-search'), changeNode('zebra-fix')])!

    expect(text.split('\n')).toEqual(['add-search', 'zebra-fix'])
  })
})

describe('Send a Spectra command for the selected change — selection gate', () => {
  // One row per line of the spec's "submenu availability and destination" table.
  const rows: Array<{ label: string; selection: SpectraNode[]; expected: string | undefined }> = [
    { label: 'one change', selection: [changeNode('add-search')], expected: 'add-search' },
    {
      label: 'two changes',
      selection: [changeNode('add-search'), changeNode('zebra-fix')],
      expected: undefined,
    },
    { label: 'group only', selection: [groupNode], expected: undefined },
    { label: 'artifact only', selection: [artifactNode], expected: undefined },
    {
      label: 'group, change and artifact',
      selection: [groupNode, changeNode('add-search'), artifactNode],
      expected: 'add-search',
    },
    { label: 'nothing selected', selection: [], expected: undefined },
  ]

  it.each(rows)('$label', ({ selection, expected }) => {
    expect(soleChange(selection)?.name).toBe(expected)
  })
})
