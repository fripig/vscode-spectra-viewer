# Spectra Viewer

*English · [繁體中文](README.zh-TW.md)*

Browse your [Spectra](https://spectra.5xcamp.us/) changes inside VS Code — no switching to the terminal.

Spectra moves parked changes out of `openspec/changes/` into the git directory, which makes them invisible in the explorer. This extension adds a **Spectra** view to the activity bar that lists Active, Parked, and Archived changes side by side, shows the task progress of each, opens their Markdown documents in the editor, and hands the matching Spectra command straight to your terminal.

The extension reads files directly. It **does not require the Spectra app to be running**, and it never touches Spectra's internal database.

> **Unofficial project**: This is a community-built third-party extension. It is not affiliated with, nor endorsed by, Spectra. All Spectra-related names belong to their respective owners.

## Features

- **Three groups side by side**: Active (`openspec/changes/`), Parked (`spectra-app/changes/` under the git directory), and Archived (`openspec/changes/archive/`). Group nodes show the change count, and stay visible even when the count is zero.
- **Task progress**: Parses each change's `tasks.md` and shows "completed/total" on the node. Checkboxes inside fenced code blocks are ignored.
- **Status icon**: Draft, Not Started, In Progress and Complete are derived from task progress, each with its own icon.
- **Proposer**: Reads `created_by` from each change's `.openspec.yaml` and shows it between the change name and the task progress, in all three groups. Only the name is shown — the email address is dropped. A change with no usable name shows no proposer and no placeholder. An archived change shows whoever proposed it, not whoever archived it.
- **Sorting**: Name, Modified or Created — Modified (newest first) is the default. The current option is shown beside the view title, and the menu lists only the options you can switch to. Changes with an unknown date always sort last; those sharing a date fall back to name order. Sorting only rebuilds the tree — it never rescans.
- **Filter by name**: The filter button in the title bar opens an input box; the text is matched case-insensitively against change names across all three groups. While filtering, group nodes show both the matching count and the total, so filtered-out changes cannot be mistaken for missing data. Only names are matched — artifact paths and the proposer are not — and every artifact of a matching change stays visible. Clearing the input clears the filter.
- **Copy change names**: Select one or more changes and press the copy shortcut, or use the context menu. You get the names alone, one per line — no group prefix, no proposer, no progress counts. The shortcut applies only while this view has focus.
- **Send a Spectra command**: Right-click a change and choose **Spectra Command…**, then pick one of `/spectra-apply`, `/spectra-ingest`, `/spectra-archive` or `/spectra-commit` — each already carrying that change's name. The command is typed into your active terminal but **never run**: it waits at the prompt until you press Enter yourself, so picking the wrong tab costs nothing more than a line you can delete. With no active terminal, the same text goes to the clipboard instead, and the picker title tells you which of the two is about to happen.
- **Open documents**: Click an artifact node to open its Markdown in the editor. If the file has been deleted, you get a non-blocking warning instead of an error dialog.
- **Refresh**: Re-scanning from the title bar preserves the expanded state and the filter text.
- **Git worktree support**: When `.git` is a file, the real git directory is resolved via `gitdir:` and `commondir`, and parked changes are located from there.

Scanning always runs asynchronously and never blocks the editor.

## Installation

Not on a marketplace yet. Download the `.vsix` from the [latest release](https://github.com/fripig/vscode-spectra-viewer/releases/latest) and install it:

```bash
code --install-extension spectra-viewer-0.1.0.vsix
```

Or, in the editor: <kbd>Cmd/Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> → **Extensions: Install from VSIX…** → pick the file.

VS Code forks such as Cursor work the same way — swap `code` for that editor's CLI. On macOS, where the CLI is often not on `PATH`, the Cursor one lives at `/Applications/Cursor.app/Contents/Resources/app/bin/cursor`.

To build it yourself instead:

```bash
npm install
npx vsce package          # produces vscode-spectra-viewer-<version>.vsix
```

Requires VS Code 1.90 or later.

## Differences from the JetBrains plugin

Every feature of the reference JetBrains plugin has been ported. Two behaviours differ on purpose:

- **The filter applies on submit, not as you type.** A VS Code tree view has nowhere to put an input control, so filtering is driven by a command and an input box. The current filter text stays visible beside the view title.
- **Only the first workspace folder is scanned.**

## Development

```bash
npm install
npm run compile      # esbuild bundle into dist/
npm run check-types  # tsc --noEmit
npm test             # Vitest unit tests
```

Press <kbd>F5</kbd> to try it in an Extension Development Host.

`src/discovery/` imports nothing from `vscode`, so the whole layer runs under Vitest in plain Node — no VS Code test host required.

```
src/
├── discovery/   # file system scanning, tasks.md and .openspec.yaml parsing, git directory resolution
├── view/        # tree node model, ordering, filtering, and the TreeDataProvider
└── test/        # Vitest unit tests
openspec/        # Spectra specs (this project is itself developed with SDD)
```

CI runs the type check, the tests and a packaging step on Node 20.9 and 22. The older version is deliberate: it is the Node that VS Code 1.90 ships in its extension host, so an API missing there fails the build rather than the user's editor.

## License

[MIT](LICENSE) © fripig
