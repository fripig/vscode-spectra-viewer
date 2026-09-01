import { describe, expect, it } from 'vitest'
import { SPECTRA_COMMANDS, commandText } from '../view/spectraCommand'

describe('Send a Spectra command for the selected change — command text', () => {
  // One row per line of the spec's "command text for each submenu item" table,
  // with its change name `add-search`.
  const rows: Array<[string, string]> = [
    ['/spectra-apply', '/spectra-apply add-search'],
    ['/spectra-ingest', '/spectra-ingest add-search'],
    ['/spectra-archive', '/spectra-archive add-search'],
    ['/spectra-commit', '/spectra-commit add-search'],
  ]

  it.each(rows)('%s yields %s', (command, expected) => {
    expect(commandText(command, 'add-search')).toBe(expected)
  })

  it('lists the four commands in the order the spec gives them', () => {
    expect(SPECTRA_COMMANDS).toEqual([
      '/spectra-apply',
      '/spectra-ingest',
      '/spectra-archive',
      '/spectra-commit',
    ])
  })

  it('produces a single line with no trailing newline', () => {
    for (const command of SPECTRA_COMMANDS) {
      const text = commandText(command, 'add-search')
      expect(text.endsWith('\n')).toBe(false)
      expect(text.split('\n')).toHaveLength(1)
    }
  })

  it('joins the command and the name with exactly one space', () => {
    expect(commandText('/spectra-apply', 'add-search').split(' ')).toEqual([
      '/spectra-apply',
      'add-search',
    ])
  })
})
