## MODIFIED Requirements

### Requirement: Display changes as a grouped tree

The view SHALL display the scan snapshot as a tree. The first level SHALL consist of exactly three group nodes labelled Active, Parked, and Archived, in that order. The second level SHALL consist of change nodes showing the change name. The third level SHALL consist of artifact nodes showing each Markdown file path relative to its change directory.

When the filter text is empty, a group node SHALL show the number of changes in that group. When the filter text is non-empty, a group node SHALL show both the number of matching changes and the group's total number of changes, so that filtered-out changes cannot be mistaken for missing data.

A group node SHALL be displayed even when it contains no changes, and even when no change in it matches the filter.

#### Scenario: Groups render with counts

- **GIVEN** a snapshot with two active changes, one parked change, and no archived changes
- **WHEN** the view renders the snapshot with an empty filter
- **THEN** the tree shows Active with count 2, Parked with count 1, and Archived with count 0

#### Scenario: Groups render matched and total counts while filtering

- **GIVEN** a snapshot with three active changes, one parked change, and no archived changes, where one active change and the parked change match the filter
- **WHEN** the view renders the snapshot with that filter applied
- **THEN** the Active group shows 1 matching out of 3, the Parked group shows 1 matching out of 1, and the Archived group shows 0 matching out of 0

#### Scenario: Parked changes are visible

- **GIVEN** a change that has been parked and therefore no longer exists under `openspec/changes/`
- **WHEN** the view renders the snapshot
- **THEN** that change appears under the Parked group with its name

#### Scenario: Artifacts appear beneath their change

- **GIVEN** a change named `add-search` containing `proposal.md` and `specs/theme-engine/spec.md`
- **WHEN** the user expands that change node
- **THEN** two artifact nodes appear, labelled `proposal.md` and `specs/theme-engine/spec.md`

## ADDED Requirements

### Requirement: Filter changes by name

The view SHALL provide a way to set a filter text, and SHALL show the current filter text in the user interface while it is non-empty. When the filter text is non-empty, a change SHALL be shown only when its name contains the filter text, compared case-insensitively. The filter SHALL apply to all three groups at once. Clearing the filter text SHALL restore the unfiltered tree.

The filter SHALL match change names only. Artifact paths SHALL NOT participate in the comparison, and every artifact of a matching change SHALL remain visible.

Changing the filter SHALL rebuild the tree without rescanning the file system. A refresh SHALL preserve the current filter text and apply it to the new snapshot. The filter SHALL NOT be matched against the proposer.

#### Scenario: Filtering narrows every group

- **GIVEN** the Active group contains `add-search`, `mid-tier`, and `zebra-fix`, and the Parked group contains `search-cache`
- **WHEN** the filter text is `search`
- **THEN** the Active group shows only `add-search` and the Parked group shows only `search-cache`

#### Scenario: Filtering is case-insensitive

- **GIVEN** the Active group contains `add-search`
- **WHEN** the filter text is `SEARCH`
- **THEN** `add-search` is shown

#### Scenario: Artifacts of a matching change stay visible

- **GIVEN** a change named `add-search` containing `proposal.md` and `tasks.md`
- **WHEN** the filter text is `search`
- **THEN** `add-search` is shown with both of its artifact nodes

#### Scenario: Artifact paths are not matched

- **GIVEN** a change named `add-search` containing `proposal.md`, and a change named `mid-tier` containing `proposal.md`
- **WHEN** the filter text is `proposal`
- **THEN** neither change is shown

#### Scenario: A filter matching nothing empties the groups

- **GIVEN** any snapshot
- **WHEN** the filter text matches no change name
- **THEN** all three group nodes are shown with no change nodes beneath them

#### Scenario: Clearing the filter restores every change

- **GIVEN** a filter text is in effect and some changes are hidden
- **WHEN** the filter text is cleared
- **THEN** every change in the snapshot is shown again

#### Scenario: Refresh preserves the filter

- **GIVEN** a filter text is in effect
- **WHEN** the user triggers Refresh
- **THEN** the new snapshot is rendered with the same filter still applied

#### Scenario: Filtering does not match the proposer

- **GIVEN** the Active group contains a change named `add-dark-mode` proposed by `fripig`
- **WHEN** the filter text is `fripig`
- **THEN** that change does not appear among the matching changes

---

### Requirement: Copy change names to the clipboard

The view SHALL provide a command that writes the names of the selected changes to the system clipboard as plain text. The command SHALL be reachable both from a context menu on the tree and from a keyboard shortcut that applies only while the tree has focus. The view SHALL allow more than one node to be selected at a time.

The copied text SHALL be the change name alone. It SHALL NOT include the group the change belongs to, the proposer, or the task progress counts shown on the node.

Only change nodes SHALL be copyable. When the selection contains no change node, the clipboard contents SHALL remain unchanged.

When the selection contains several change nodes, the copied text SHALL contain every selected change name, separated by a single newline, in the order the nodes appear in the tree from top to bottom. Group nodes and artifact nodes in the selection SHALL be ignored rather than blocking the copy.

A successful copy SHALL NOT produce a notification or any other visible feedback.

#### Scenario: Copy a single change name

- **GIVEN** the Active group contains a change named `add-search` proposed by `fripig` whose task progress is 3 of 7
- **WHEN** the user selects that change node and invokes the copy command
- **THEN** the clipboard contains exactly `add-search`, without the group name, the proposer, or the progress counts

#### Scenario: Copy several changes at once

- **WHEN** the user selects more than one change node and invokes the copy command
- **THEN** the clipboard contains every selected change name, one per line, ordered as the nodes appear in the tree

#### Scenario: Copy is unavailable when no change is selected

- **WHEN** the user selects only a group node, only an artifact node, or nothing at all, and invokes the copy command
- **THEN** the clipboard contents remain unchanged and no notification is shown

##### Example: selections and their clipboard contents

| Selection (top to bottom)                               | Clipboard contents             |
| ------------------------------------------------------- | ------------------------------ |
| change `add-search`                                     | `add-search`                   |
| changes `add-search`, `zebra-fix`                       | `add-search` newline `zebra-fix` |
| group Active                                            | unchanged                      |
| artifact `design.md`                                    | unchanged                      |
| group Active, change `add-search`, artifact `design.md` | `add-search`                   |
| nothing selected                                        | unchanged                      |

#### Scenario: Copying does not rescan or rebuild the tree

- **WHEN** the user invokes the copy command
- **THEN** no file system scan runs, and the tree keeps its current expansion state, sort order, and filter text

---

### Requirement: Send a Spectra command for the selected change

The view's context menu SHALL offer an item that opens a picker listing four Spectra commands, each already applied to the selected change: `/spectra-apply`, `/spectra-ingest`, `/spectra-archive` and `/spectra-commit`, listed in that order. Each item SHALL display the full command text it produces, so what the user reads is exactly what the item delivers.

The command text SHALL be a single line consisting of the slash command name, one space, and the change name, with no trailing newline. It SHALL NOT include the group the change belongs to, the proposer, or the task progress counts shown on the node.

A terminal target SHALL be available when the editor has an active terminal, and SHALL NOT be available otherwise.

When a terminal target is available, the picker title SHALL say the command is sent to the terminal, and choosing an item SHALL write that item's command text into the active terminal's input position without appending a newline and without executing it, then move focus to that terminal. The clipboard contents SHALL remain unchanged.

When no terminal target is available, the picker title SHALL say the command is copied, and choosing an item SHALL write that item's command text to the system clipboard. Focus SHALL NOT move, and no notification SHALL be shown.

The picker SHALL be offered only when the selection contains exactly one change node. Group nodes and artifact nodes in the selection SHALL be ignored rather than blocking that count. When the selection contains no change node or more than one, the picker SHALL NOT open.

Choosing any item SHALL NOT run a file system scan, and the tree SHALL keep its current expansion state, sort order, and filter text.

#### Scenario: Send a command to the active terminal

- **GIVEN** the Active group contains a change named `add-search` and the editor has an active terminal
- **WHEN** the user selects that change node and chooses `/spectra-apply add-search` from the picker
- **THEN** the text `/spectra-apply add-search` appears at that terminal's input position, no newline is sent, the command is not executed, focus moves to that terminal, and the clipboard contents remain unchanged

#### Scenario: The user decides whether the command runs

- **GIVEN** a command has been written into the active terminal
- **WHEN** the user presses Enter in that terminal
- **THEN** the command is submitted, and until that moment nothing has been executed

#### Scenario: The picker title names the action that will happen

- **WHEN** the user opens the context menu on a single change node
- **THEN** the picker title says the command is sent to the terminal if a terminal target is available and that it is copied if it is not, while the item texts stay the same in both states

#### Scenario: Fall back to the clipboard with no active terminal

- **GIVEN** the editor has no active terminal
- **WHEN** the user chooses `/spectra-ingest add-search` from the picker
- **THEN** the clipboard contains exactly `/spectra-ingest add-search`, focus does not move, and no notification is shown

#### Scenario: Writing to the terminal fails

- **GIVEN** a terminal target is available
- **WHEN** choosing an item raises an error while writing to that terminal
- **THEN** the error is recorded in the extension's output channel, the command text is written to the clipboard instead, and no dialog is shown

#### Scenario: The picker does not open for a multi-node selection

- **WHEN** the user selects two change nodes and opens the context menu
- **THEN** the picker does not open, nothing is sent, and the clipboard contents remain unchanged

#### Scenario: Group and artifact nodes do not block a single change selection

- **GIVEN** the selection holds the group Active, the change `add-search`, and the artifact `design.md`
- **WHEN** the user opens the context menu
- **THEN** the picker opens and its items carry the change name `add-search`

##### Example: command text for each picker item

- **GIVEN** the selected change is named `add-search`

| Picker item                  | Command text produced        |
| ---------------------------- | ---------------------------- |
| `/spectra-apply add-search`  | `/spectra-apply add-search`  |
| `/spectra-ingest add-search` | `/spectra-ingest add-search` |
| `/spectra-archive add-search`| `/spectra-archive add-search`|
| `/spectra-commit add-search` | `/spectra-commit add-search` |

##### Example: picker availability and destination

| Selection                                               | Terminal target available | Invoking an item                                    |
| ------------------------------------------------------- | ------------------------- | --------------------------------------------------- |
| one change `add-search`                                 | yes                       | text written to the active terminal, focus moves     |
| one change `add-search`                                 | no                        | text written to the clipboard, focus stays           |
| changes `add-search` and `zebra-fix`                    | yes                       | picker does not open, nothing happens                |
| group Active only                                       | no                        | picker does not open, nothing happens                |
| group Active, change `add-search`, artifact `design.md` | yes                       | text for `add-search` written to the active terminal |
| nothing selected                                        | yes                       | picker does not open, nothing happens                |
