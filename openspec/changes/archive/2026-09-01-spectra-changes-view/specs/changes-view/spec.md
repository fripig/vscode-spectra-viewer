## ADDED Requirements

### Requirement: Provide a Spectra view

The extension SHALL contribute a view container named Spectra to the activity bar, holding a single view named Changes. The extension SHALL activate when that view is first revealed, and SHALL NOT activate on editor startup.

#### Scenario: The view is available

- **WHEN** the extension is installed and a folder is opened
- **THEN** a Spectra entry appears in the activity bar and selecting it reveals a view named Changes

#### Scenario: The extension stays dormant until the view is opened

- **WHEN** a folder is opened and the Spectra view has not been revealed
- **THEN** the extension has not activated and no scan has run

---

### Requirement: Display changes as a grouped tree

The view SHALL display the scan snapshot as a tree. The first level SHALL consist of exactly three group nodes labelled Active, Parked, and Archived, in that order. The second level SHALL consist of change nodes showing the change name. The third level SHALL consist of artifact nodes showing each Markdown file path relative to its change directory.

A group node SHALL show the number of changes it contains. A group node SHALL be displayed even when it contains no changes.

#### Scenario: Groups render with counts

- **GIVEN** a snapshot with two active changes, one parked change, and no archived changes
- **WHEN** the view renders the snapshot
- **THEN** the tree shows Active with count 2, Parked with count 1, and Archived with count 0

#### Scenario: Parked changes are visible

- **GIVEN** a change that has been parked and therefore no longer exists under `openspec/changes/`
- **WHEN** the view renders the snapshot
- **THEN** that change appears under the Parked group with its name

#### Scenario: Artifacts appear beneath their change

- **GIVEN** a change named `add-search` containing `proposal.md` and `specs/theme-engine/spec.md`
- **WHEN** the user expands that change node
- **THEN** two artifact nodes appear, labelled `proposal.md` and `specs/theme-engine/spec.md`

---

### Requirement: Order changes by name within groups

The view SHALL order the change nodes within each group by name, ascending, using a case-insensitive comparison. The order of the three groups themselves SHALL NOT change.

#### Scenario: Changes are listed alphabetically

- **GIVEN** the Active group holds `zebra-fix`, `add-search`, and `mid-tier` in unspecified snapshot order
- **WHEN** the view renders the snapshot
- **THEN** the change nodes appear in the order `add-search`, `mid-tier`, `zebra-fix`

##### Example: case-insensitive ordering

- **GIVEN** the Active group holds `Zebra-fix`, `add-search`, and `Mid-tier`
- **WHEN** the view renders the snapshot
- **THEN** the change nodes appear in the order `add-search`, `Mid-tier`, `Zebra-fix`

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

---

### Requirement: Scan only the first workspace folder

The view SHALL treat the first workspace folder as the project root. Remaining workspace folders SHALL NOT be scanned and SHALL NOT appear in the tree.

#### Scenario: Multi-root workspace

- **GIVEN** a workspace holding two folders, both containing an `openspec` directory
- **WHEN** the view is revealed
- **THEN** the tree shows only the changes found under the first folder, with no folder level above the three groups
