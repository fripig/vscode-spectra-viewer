/**
 * The Spectra slash commands the view can hand to a terminal.
 *
 * These are the four that take a change name as their only argument, listed
 * in the order the workflow runs them.
 */
export const SPECTRA_COMMANDS = [
  '/spectra-apply',
  '/spectra-ingest',
  '/spectra-archive',
  '/spectra-commit',
] as const

export type SpectraCommand = (typeof SPECTRA_COMMANDS)[number]

/**
 * One line: the command, one space, the change name.
 *
 * No trailing newline, deliberately — the text is written to the terminal's
 * input position and left there, so the user presses Enter themselves.
 */
export function commandText(command: string, changeName: string): string {
  return `${command} ${changeName}`
}
