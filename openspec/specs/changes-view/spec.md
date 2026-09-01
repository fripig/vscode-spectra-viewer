# changes-view Specification

## Purpose

Present a discovery snapshot as a VS Code tree view: three fixed groups, their changes and artifacts, plus opening, refreshing, and the uninitialised state.

## Requirements

### Requirement: Provide a Spectra view

The extension SHALL contribute a view container named Spectra to the activity bar, holding a single view named Changes. The extension SHALL activate when that view is first revealed, and SHALL NOT activate on editor startup.

#### Scenario: The view is available

- **WHEN** the extension is installed and a folder is opened
- **THEN** a Spectra entry appears in the activity bar and selecting it reveals a view named Changes

#### Scenario: The extension stays dormant until the view is opened

- **WHEN** a folder is opened and the Spectra view has not been revealed
- **THEN** the extension has not activated and no scan has run


<!-- @trace
source: spectra-changes-view
updated: 2026-09-01
code:
  - package.json
  - resources/spectra.svg
  - src/extension.ts
tests:
  - src/test/manifest.test.ts
-->

---
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


<!-- @trace
source: filter-copy-and-terminal
updated: 2026-09-01
code:
  - src/view/nodes.ts
  - src/view/changeFilter.ts
  - src/view/changesTreeDataProvider.ts
tests:
  - src/test/nodes.test.ts
-->

---
### Requirement: Show task progress on change nodes

A change node SHALL display its completed and total task counts when progress information is available. A change node SHALL NOT display counts when no progress information is available, and SHALL NOT display placeholder text in their place.

#### Scenario: Change with tasks

- **GIVEN** a change whose `tasks.md` has 3 of 8 items complete
- **WHEN** the view renders that change node
- **THEN** the node text includes both the completed count 3 and the total count 8

#### Scenario: Change without tasks

- **GIVEN** a change with no counted task items
- **WHEN** the view renders that change node
- **THEN** the node text shows the change name without task counts


<!-- @trace
source: spectra-changes-view
updated: 2026-09-01
code:
  - src/view/nodes.ts
  - src/view/changesTreeDataProvider.ts
tests:
  - src/test/nodes.test.ts
-->

---
### Requirement: Show change status as the node icon

A change node SHALL carry an icon determined by its derived status. Each of the four statuses SHALL map to a distinct icon, so that a change's status is readable without expanding the node. Group nodes and artifact nodes SHALL NOT use any of those four icons.

#### Scenario: Status selects the icon

- **WHEN** the view renders a change node
- **THEN** the node's icon is the one mapped to that change's derived status

##### Example: icon by status

| Status      | Icon distinct from the other three |
| ----------- | ---------------------------------- |
| Draft       | yes                                |
| Not Started | yes                                |
| In Progress | yes                                |
| Complete    | yes                                |

#### Scenario: Two changes with the same status share an icon

- **GIVEN** two changes both with status In Progress
- **WHEN** the view renders both change nodes
- **THEN** both carry the same icon


<!-- @trace
source: spectra-changes-view
updated: 2026-09-01
code:
  - src/view/nodes.ts
  - src/view/changesTreeDataProvider.ts
tests:
  - src/test/nodes.test.ts
-->

---
### Requirement: Open artifact files in the editor

Clicking an artifact node SHALL open the corresponding file in an editor tab. When the file no longer exists at the time of activation, the extension SHALL show a non-blocking warning notification and SHALL NOT raise an unhandled error or show a modal dialog.

#### Scenario: Open an artifact

- **WHEN** the user clicks an artifact node
- **THEN** the corresponding Markdown file opens in an editor tab

#### Scenario: Open a deleted artifact

- **GIVEN** an artifact node whose backing file was deleted after the last scan
- **WHEN** the user clicks that node
- **THEN** a non-blocking warning notification reports that the file is unavailable and the view remains usable

#### Scenario: Clicking a group or change node does not open an editor

- **WHEN** the user clicks a group node or a change node
- **THEN** the node expands or collapses and no editor tab is opened


<!-- @trace
source: spectra-changes-view
updated: 2026-09-01
code:
  - src/extension.ts
  - src/view/changesTreeDataProvider.ts
  - package.json
tests:
  - src/test/manifest.test.ts
-->

---
### Requirement: Refresh on demand

The view SHALL provide a Refresh action in its title bar that triggers a new scan and rebuilds the tree from the resulting snapshot. Previously expanded group and change nodes SHALL be expanded again after the rebuild, for every node that still exists. The view SHALL run an initial scan when it is first revealed.

#### Scenario: Refresh reflects a newly parked change

- **GIVEN** the view shows a change under the Active group
- **WHEN** the change is parked outside the editor and the user triggers Refresh
- **THEN** the change appears under the Parked group and no longer under the Active group

#### Scenario: Expansion state survives refresh

- **GIVEN** the user has expanded the Parked group and one change node inside it
- **WHEN** the user triggers Refresh and those nodes still exist
- **THEN** the Parked group and that change node are expanded again

#### Scenario: A node that disappears is not restored

- **GIVEN** the user has expanded a change node
- **WHEN** that change directory is deleted outside the editor and the user triggers Refresh
- **THEN** the node is absent from the tree and no error is raised

#### Scenario: Initial scan on reveal

- **WHEN** the user reveals the view for the first time in a session
- **THEN** a scan runs and the tree is populated from its result


<!-- @trace
source: spectra-changes-view
updated: 2026-09-01
code:
  - src/view/changesTreeDataProvider.ts
  - src/extension.ts
  - package.json
tests:
  - src/test/manifest.test.ts
-->

---
### Requirement: Indicate loading and uninitialised states

While a scan is running, the view SHALL indicate that loading is in progress. When the first workspace folder has no `openspec` directory, or when no workspace folder is open, the view SHALL replace the tree with a welcome message stating that the workspace is not initialised for Spectra.

#### Scenario: Loading indicator

- **WHEN** a scan is in progress
- **THEN** the view indicates that it is loading

#### Scenario: Workspace without Spectra

- **GIVEN** a workspace folder with no `openspec` directory
- **WHEN** the view is revealed
- **THEN** a welcome message is shown instead of the tree

#### Scenario: No folder open

- **GIVEN** no workspace folder is open
- **WHEN** the view is revealed
- **THEN** the same welcome message is shown and no error is raised

#### Scenario: Initialising the workspace clears the welcome state

- **GIVEN** the welcome message is shown for a workspace folder with no `openspec` directory
- **WHEN** an `openspec` directory is created outside the editor and the user triggers Refresh
- **THEN** the tree replaces the welcome message and shows the three groups


<!-- @trace
source: spectra-changes-view
updated: 2026-09-01
code:
  - src/view/changesTreeDataProvider.ts
  - src/discovery/scanner.ts
  - package.json
tests:
  - src/test/manifest.test.ts
  - src/test/scanner.test.ts
-->

---
### Requirement: Scan only the first workspace folder

The view SHALL treat the first workspace folder as the project root. Remaining workspace folders SHALL NOT be scanned and SHALL NOT appear in the tree.

#### Scenario: Multi-root workspace

- **GIVEN** a workspace holding two folders, both containing an `openspec` directory
- **WHEN** the view is revealed
- **THEN** the tree shows only the changes found under the first folder, with no folder level above the three groups


<!-- @trace
source: spectra-changes-view
updated: 2026-09-01
code:
  - src/view/changesTreeDataProvider.ts
-->

---
### Requirement: Show the proposer on change nodes

A change node SHALL display the proposer of its change when a proposer is available. A change node SHALL NOT display any placeholder text when the proposer is unknown.

The proposer SHALL be rendered between the change name and the task progress counts, so that the progress counts stay at the end of the node text and their position does not shift with the length of the proposer name. The proposer SHALL be rendered with the same de-emphasised styling as the task progress counts.

This behaviour SHALL be identical for change nodes in the Active, Parked, and Archived groups. An archived change SHALL show its proposer, not whoever archived it.

The proposer SHALL NOT affect the sort order.

#### Scenario: Change with a known proposer

- **GIVEN** a change named `add-dark-mode` proposed by `fripig` whose `tasks.md` has 3 of 8 items complete
- **WHEN** the view renders that change node
- **THEN** the node text contains `add-dark-mode`, then `fripig`, then the counts 3 and 8, in that order

#### Scenario: Change with an unknown proposer

- **GIVEN** a change whose proposer is unknown
- **WHEN** the view renders that change node
- **THEN** the node text shows the change name and its task counts, with no proposer segment and no placeholder text

#### Scenario: Change with a proposer and no task progress

- **GIVEN** a change named `add-dark-mode` proposed by `fripig` with no counted task items
- **WHEN** the view renders that change node
- **THEN** the node text contains `add-dark-mode` and `fripig`, and no task counts

#### Scenario: Every group shows the proposer

- **GIVEN** one change in each of the Active, Parked, and Archived groups, each with a known proposer
- **WHEN** the view renders the tree
- **THEN** all three change nodes display their proposer

##### Example: node text by proposer and progress

| Change name     | Proposer | Task progress | Node text                      |
| --------------- | -------- | ------------- | ------------------------------ |
| `add-dark-mode` | `fripig` | 3 of 8        | `add-dark-mode` `fripig` `3/8` |
| `add-dark-mode` | unknown  | 3 of 8        | `add-dark-mode` `3/8`          |
| `add-dark-mode` | `fripig` | none          | `add-dark-mode` `fripig`       |
| `add-dark-mode` | unknown  | none          | `add-dark-mode`                |


<!-- @trace
source: show-proposer-and-sorting
updated: 2026-09-01
code:
  - src/view/nodes.ts
  - src/view/changesTreeDataProvider.ts
tests:
  - src/test/nodes.test.ts
-->

---
### Requirement: Sort changes within groups

The view SHALL let the user choose how changes are ordered within each group, from exactly three mutually exclusive options: Name, Modified, and Created. The current option SHALL be indicated in the user interface. The default SHALL be Modified.

Name SHALL order changes by name ascending, using a case-insensitive comparison. Modified SHALL order changes by modification date, most recent first. Created SHALL order changes by creation date, most recent first. For both date orders, changes whose date is unknown SHALL be placed last regardless of direction, and changes sharing a date SHALL be ordered by name ascending.

Sorting SHALL apply within each group only; the order of the three groups themselves SHALL NOT change. Changing the sort option SHALL rebuild the tree without rescanning the file system.

#### Scenario: Each option produces its own order

- **WHEN** the user selects a sort option
- **THEN** every group is reordered according to that option's rules

##### Example: three changes under each sort option

- **GIVEN** the Active group contains `add-search` (created 2026-08-10, modified 2026-08-12 09:00), `mid-tier` (created 2026-08-12, modified 2026-08-11 17:00), and `zebra-fix` (creation date unknown, modified 2026-08-13 08:00)
- **WHEN** the user selects each sort option in turn
- **THEN** Name yields `add-search`, `mid-tier`, `zebra-fix`; Modified yields `zebra-fix`, `add-search`, `mid-tier`; and Created yields `mid-tier`, `add-search`, `zebra-fix`

#### Scenario: Changes with an unknown date sort last

- **GIVEN** a group containing changes both with and without a creation date
- **WHEN** the user sorts by Created
- **THEN** every change with a creation date appears before every change without one

#### Scenario: Changes sharing a date fall back to name order

- **GIVEN** a group containing `zebra-fix` and `add-search`, both created 2026-08-10
- **WHEN** the user sorts by Created
- **THEN** `add-search` appears before `zebra-fix`

#### Scenario: Name order is case-insensitive

- **GIVEN** the Active group holds `Zebra-fix`, `add-search`, and `Mid-tier`
- **WHEN** the user sorts by Name
- **THEN** the change nodes appear in the order `add-search`, `Mid-tier`, `Zebra-fix`

#### Scenario: Sorting does not rescan

- **WHEN** the user changes the sort option
- **THEN** the tree is reordered from the existing snapshot and no file system scan runs

#### Scenario: Sorting does not reorder the groups

- **WHEN** the user selects any sort option
- **THEN** the three group nodes remain in the order Active, Parked, Archived

#### Scenario: Default sort option

- **WHEN** the view is revealed for the first time in a session
- **THEN** changes are ordered by Modified, most recent first


<!-- @trace
source: show-proposer-and-sorting
updated: 2026-09-01
code:
  - src/view/changeOrder.ts
  - src/view/nodes.ts
  - src/view/changesTreeDataProvider.ts
  - src/extension.ts
  - package.json
tests:
  - src/test/changeOrder.test.ts
  - src/test/nodes.test.ts
  - src/test/manifest.test.ts
-->

---
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


<!-- @trace
source: filter-copy-and-terminal
updated: 2026-09-01
code:
  - src/view/changeFilter.ts
  - src/view/nodes.ts
  - src/view/changesTreeDataProvider.ts
  - src/extension.ts
  - package.json
tests:
  - src/test/changeFilter.test.ts
  - src/test/nodes.test.ts
  - src/test/manifest.test.ts
-->

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


<!-- @trace
source: filter-copy-and-terminal
updated: 2026-09-01
code:
  - src/view/copySelection.ts
  - src/extension.ts
  - package.json
tests:
  - src/test/copySelection.test.ts
  - src/test/manifest.test.ts
-->

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


<!-- @trace
source: filter-copy-and-terminal
updated: 2026-09-01
code:
  - src/view/spectraCommand.ts
  - src/view/copySelection.ts
  - src/extension.ts
  - package.json
tests:
  - src/test/spectraCommand.test.ts
  - src/test/copySelection.test.ts
  - src/test/manifest.test.ts
-->
