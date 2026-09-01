## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Order changes by name within groups

**Reason**: Superseded by `Sort changes within groups`, which makes name ordering one of three user-selectable options rather than the only order, and changes the default to Modified.

**Migration**: The previous behaviour is still reachable by selecting the Name sort option, which keeps the same case-insensitive ascending comparison. No data or configuration migration is required; a session that does not touch the sort option now opens with Modified rather than Name.
