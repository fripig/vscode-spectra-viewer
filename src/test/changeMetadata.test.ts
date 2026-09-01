import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readChangeMetadata } from '../discovery/changeMetadata'

async function changeDir(yaml?: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'spectra-meta-'))
  if (yaml !== undefined) {
    await writeFile(join(dir, '.openspec.yaml'), yaml, 'utf8')
  }
  return dir
}

describe('Report per-change metadata — creation date', () => {
  // One row per line of the spec's "creation metadata cases" example table.
  const rows: Array<{ label: string; yaml?: string; created: string | undefined }> = [
    { label: 'created: 2026-08-10', yaml: 'created: 2026-08-10\n', created: '2026-08-10' },
    { label: 'schema: spec-driven only', yaml: 'schema: spec-driven\n', created: undefined },
    { label: 'created: last Tuesday', yaml: 'created: last Tuesday\n', created: undefined },
    { label: 'created: with no value', yaml: 'created:\n', created: undefined },
    { label: 'file absent', created: undefined },
  ]

  it.each(rows)('$label', async ({ yaml, created }) => {
    const metadata = await readChangeMetadata(await changeDir(yaml))

    if (created === undefined) {
      expect(metadata.created).toBeUndefined()
    } else {
      expect(metadata.created?.toISOString().slice(0, 10)).toBe(created)
    }
  })

  it('never throws when the metadata file cannot be read', async () => {
    await expect(readChangeMetadata('/nonexistent/change/dir')).resolves.toEqual({
      created: undefined,
      proposer: undefined,
    })
  })
})

describe('Report per-change metadata — proposer', () => {
  // One row per line of the spec's "proposer display name cases" example table.
  const rows: Array<{ label: string; yaml?: string; proposer: string | undefined }> = [
    { label: 'fripig <fripig@gmail.com>', yaml: 'created_by: fripig <fripig@gmail.com>\n', proposer: 'fripig' },
    { label: 'Alice Chen <a@example.com>', yaml: 'created_by: Alice Chen <a@example.com>\n', proposer: 'Alice Chen' },
    { label: 'fripig', yaml: 'created_by: fripig\n', proposer: 'fripig' },
    { label: '<fripig@gmail.com>', yaml: 'created_by: <fripig@gmail.com>\n', proposer: undefined },
    { label: 'created_by: with no value', yaml: 'created_by:\n', proposer: undefined },
    { label: 'field absent', yaml: 'created: 2026-08-10\n', proposer: undefined },
    { label: 'file absent', proposer: undefined },
  ]

  it.each(rows)('$label', async ({ yaml, proposer }) => {
    expect((await readChangeMetadata(await changeDir(yaml))).proposer).toBe(proposer)
  })

  it('never reports the email address', async () => {
    const dir = await changeDir('created_by: fripig <fripig@gmail.com>\n')

    expect((await readChangeMetadata(dir)).proposer).not.toContain('@')
  })

  it('reports the proposer of an archived change, not its archiver', async () => {
    const dir = await changeDir(
      'created_by: alice <alice@example.com>\narchived_by: bob <bob@example.com>\n',
    )

    const { proposer } = await readChangeMetadata(dir)
    expect(proposer).toBe('alice')
    expect(proposer).not.toBe('bob')
  })

  it('reads the creation date and the proposer from one file together', async () => {
    const dir = await changeDir(
      'created: 2026-08-10\ncreated_by: fripig <fripig@gmail.com>\n',
    )

    const metadata = await readChangeMetadata(dir)
    expect(metadata.created?.toISOString().slice(0, 10)).toBe('2026-08-10')
    expect(metadata.proposer).toBe('fripig')
  })

  it('lets one unusable field leave the other intact', async () => {
    const dir = await changeDir(
      'created: last Tuesday\ncreated_by: fripig <fripig@gmail.com>\n',
    )

    const metadata = await readChangeMetadata(dir)
    expect(metadata.created).toBeUndefined()
    expect(metadata.proposer).toBe('fripig')
  })
})
