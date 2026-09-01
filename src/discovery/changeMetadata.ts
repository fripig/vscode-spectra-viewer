import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/** What `.openspec.yaml` contributes to a change, both fields optional. */
export interface ChangeMetadata {
  readonly created: Date | undefined
  /** Display name only — never the email address. */
  readonly proposer: string | undefined
}

const UNKNOWN: ChangeMetadata = { created: undefined, proposer: undefined }

/** A plain `YYYY-MM-DD` date, the only form Spectra writes. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Reads one top-level scalar field, ignoring anything nested.
 *
 * Deliberately not a YAML parser: this file holds a handful of flat scalars,
 * and a field we cannot read becomes "unknown" rather than a wrong value.
 */
function scalarField(yaml: string, field: string): string | undefined {
  const pattern = new RegExp(`^${field}:[ \\t]*(.*)$`, 'm')
  const value = pattern.exec(yaml)?.[1]?.trim()
  return value === undefined || value === '' ? undefined : value
}

/**
 * Turns a `created_by` value into a display name.
 *
 * The stored form is `Name <email>`; the email is dropped because it would
 * crowd the progress counts out of a narrow side bar and has no business
 * being on screen. A value that is only an email has no display name.
 */
function parseProposer(raw: string | undefined): string | undefined {
  if (raw === undefined) {
    return undefined
  }
  const angle = raw.indexOf('<')
  const name = (angle === -1 ? raw : raw.slice(0, angle)).trim()
  return name === '' ? undefined : name
}

function parseCreated(raw: string | undefined): Date | undefined {
  if (raw === undefined || !ISO_DATE.test(raw)) {
    return undefined
  }
  const date = new Date(`${raw}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/**
 * Reads `created` and `created_by` in a single pass over `.openspec.yaml`.
 *
 * Every failure — missing file, unreadable file, absent field, empty value,
 * unparsable date — yields `undefined` for that field alone. Neither field can
 * remove the change from the snapshot; metadata is decoration, the change is not.
 */
export async function readChangeMetadata(changeDir: string): Promise<ChangeMetadata> {
  let yaml: string
  try {
    yaml = await readFile(join(changeDir, '.openspec.yaml'), 'utf8')
  } catch {
    return UNKNOWN
  }

  return {
    created: parseCreated(scalarField(yaml, 'created')),
    // `created_by` only — an archived change still shows who proposed it.
    proposer: parseProposer(scalarField(yaml, 'created_by')),
  }
}
