# change-discovery Specification

## Purpose

Locate Spectra changes on disk and report what each one contains, with no dependency on the VS Code API so the whole layer stays testable in plain Node.

## Requirements

### Requirement: Scan changes from all three Spectra sources

The system SHALL discover Spectra changes by reading the file system directly, without invoking the `spectra` CLI and without reading Spectra's internal database. A scan SHALL take a project root directory as input and produce a snapshot containing three groups of changes: Active, Parked, and Archived.

Active changes SHALL be the immediate subdirectories of `openspec/changes/` under the project root, excluding the directory named `archive`. Archived changes SHALL be the immediate subdirectories of `openspec/changes/archive/` under the project root. Parked changes SHALL be the immediate subdirectories of `spectra-app/changes/` under the resolved git directory.

The order of changes within a group is unspecified. Callers SHALL NOT depend on it; ordering is decided by the presentation layer.

#### Scenario: All three sources contain changes

- **WHEN** a scan runs against a project root that has active, parked, and archived change directories
- **THEN** the snapshot contains each change in exactly the group matching its source directory

##### Example: mixed layout

- **GIVEN** the project root contains `openspec/changes/add-search/`, `openspec/changes/archive/old-login/`, and `.git/spectra-app/changes/dark-mode/`
- **WHEN** a scan runs
- **THEN** Active contains `add-search`, Archived contains `old-login`, and Parked contains `dark-mode`

#### Scenario: The archive directory is not treated as an active change

- **WHEN** a scan runs against a project root where `openspec/changes/archive/` exists
- **THEN** no change named `archive` appears in the Active group

#### Scenario: A source directory is absent

- **WHEN** a scan runs and one of the three source directories does not exist
- **THEN** the corresponding group is empty and the remaining groups are populated normally

#### Scenario: Files beside change directories are ignored

- **GIVEN** `openspec/changes/` contains the directory `add-search` and the file `notes.md`
- **WHEN** a scan runs
- **THEN** the Active group contains `add-search` and contains no entry for `notes.md`

#### Scenario: Every discovered change is present regardless of order

- **GIVEN** `openspec/changes/` contains directories `zebra-fix`, `add-search`, and `mid-tier`
- **WHEN** a scan runs
- **THEN** the Active group contains exactly those three changes, in any order


<!-- @trace
source: spectra-changes-view
updated: 2026-09-01
code:
  - src/discovery/scanner.ts
  - src/discovery/model.ts
tests:
  - src/test/scanner.test.ts
-->

---
### Requirement: Resolve the git directory including worktree indirection

The system SHALL locate parked changes relative to the resolved git directory rather than assuming a `.git` subdirectory of the project root.

When `.git` under the project root is a directory, that directory SHALL be the resolved git directory. When `.git` is a file, the system SHALL read its `gitdir:` pointer to obtain the actual git directory; if that directory contains a `commondir` file, the path recorded in `commondir` SHALL be resolved against it and used as the resolved git directory. When `.git` is absent or cannot be resolved, the Parked group SHALL be empty and the scan SHALL NOT fail.

#### Scenario: Standard repository layout

- **WHEN** the project root contains a `.git` directory
- **THEN** parked changes are read from `spectra-app/changes/` inside that directory

#### Scenario: Git worktree layout

- **GIVEN** the project root contains a `.git` file whose content is a `gitdir:` pointer to a worktree directory containing a `commondir` file
- **WHEN** a scan runs
- **THEN** parked changes are read from `spectra-app/changes/` inside the common git directory named by `commondir`

#### Scenario: Git directory pointer without a commondir file

- **GIVEN** the project root contains a `.git` file whose `gitdir:` pointer names an existing directory that has no `commondir` file
- **WHEN** a scan runs
- **THEN** parked changes are read from `spectra-app/changes/` inside the directory the pointer names

#### Scenario: Git directory cannot be resolved

- **WHEN** the project root has no `.git` entry, or the `.git` file points to a path that does not exist
- **THEN** the Parked group is empty and the Active and Archived groups are still populated


<!-- @trace
source: spectra-changes-view
updated: 2026-09-01
code:
  - src/discovery/gitDir.ts
  - src/discovery/scanner.ts
tests:
  - src/test/gitDir.test.ts
-->

---
### Requirement: Report per-change metadata

For each discovered change, the system SHALL report its name, its group, the absolute path of its directory, the list of its Markdown artifact files, its task progress, its derived status, its creation date, its modification date, and its proposer.

The name SHALL be the change directory name. The artifact file list SHALL contain every file with the `.md` extension found beneath the change directory, expressed as a path relative to that change directory, sorted as strings.

The creation date SHALL be parsed from the `created` field of `.openspec.yaml` in the change directory. When that file is absent or unreadable, when it has no `created` field, or when the field's value cannot be parsed as an ISO date, the creation date SHALL be reported as unknown and the change SHALL still be reported.

The proposer SHALL be derived from the `created_by` field of the same `.openspec.yaml`. The reported proposer SHALL be a display name, derived from the field's raw value as follows: when the value contains a `<` character, the display name SHALL be the substring before the first `<`, trimmed of surrounding whitespace; otherwise the display name SHALL be the whole value trimmed of surrounding whitespace. When the resulting display name is empty, when the file has no `created_by` field, or when the file is absent or unreadable, the proposer SHALL be reported as unknown and the change SHALL still be reported. The proposer SHALL NOT include the email address, and SHALL NOT be derived from the `archived_by` field.

Both the creation date and the proposer SHALL be obtained from a single read of `.openspec.yaml`, so that reporting the proposer costs no additional file access.

The modification date SHALL be the most recent modification time among the change's Markdown files. When a file's modification time cannot be read, that file SHALL be excluded from the comparison. When no modification time can be obtained, the modification date SHALL be reported as unknown.

#### Scenario: Artifact files are listed relative to the change directory

- **GIVEN** a change directory containing `proposal.md`, `tasks.md`, and `specs/theme-engine/spec.md`
- **WHEN** a scan reports that change
- **THEN** the artifact list contains exactly `proposal.md`, `specs/theme-engine/spec.md`, and `tasks.md`, in that string order

#### Scenario: Non-Markdown files are excluded

- **GIVEN** a change directory containing `.openspec.yaml` and `proposal.md`
- **WHEN** a scan reports that change
- **THEN** the artifact list contains `proposal.md` and does not contain `.openspec.yaml`

#### Scenario: A change with no Markdown files reports an empty artifact list

- **GIVEN** a change directory containing only `.openspec.yaml`
- **WHEN** a scan reports that change
- **THEN** the change is reported with an empty artifact list

#### Scenario: The reported path locates the change on disk

- **WHEN** a scan reports a change
- **THEN** the reported directory path is absolute, and joining it with any entry of the artifact list names an existing file

#### Scenario: Creation date is read from the change metadata file

- **GIVEN** a change directory whose `.openspec.yaml` contains the line `created: 2026-08-10`
- **WHEN** a scan reports that change
- **THEN** the creation date is 2026-08-10

#### Scenario: Unusable creation metadata never removes a change

- **WHEN** a change's `.openspec.yaml` is missing, has no `created` field, or has a `created` value that is not an ISO date
- **THEN** the change is reported with an unknown creation date

##### Example: creation metadata cases

| `.openspec.yaml` content   | Creation date | Change reported |
| -------------------------- | ------------- | --------------- |
| `created: 2026-08-10`      | 2026-08-10    | yes             |
| `schema: spec-driven` only | unknown       | yes             |
| `created: last Tuesday`    | unknown       | yes             |
| `created:`                 | unknown       | yes             |
| file absent                | unknown       | yes             |

#### Scenario: Proposer is read from the change metadata file

- **GIVEN** a change directory whose `.openspec.yaml` contains the line `created_by: fripig <fripig@gmail.com>`
- **WHEN** a scan reports that change
- **THEN** the proposer is `fripig`, without the email address

#### Scenario: Unusable proposer metadata never removes a change

- **WHEN** a change's `.openspec.yaml` is missing, has no `created_by` field, or has a `created_by` value whose display name is empty
- **THEN** the change is reported with an unknown proposer

##### Example: proposer display name cases

| `created_by` value           | Proposer     | Change reported |
| ---------------------------- | ------------ | --------------- |
| `fripig <fripig@gmail.com>`  | `fripig`     | yes             |
| `Alice Chen <a@example.com>` | `Alice Chen` | yes             |
| `fripig`                     | `fripig`     | yes             |
| `<fripig@gmail.com>`         | unknown      | yes             |
| `created_by:` with no value  | unknown      | yes             |
| field absent                 | unknown      | yes             |
| file absent                  | unknown      | yes             |

#### Scenario: Creation date and proposer are read together

- **GIVEN** a change directory whose `.openspec.yaml` contains both `created: 2026-08-10` and `created_by: fripig <fripig@gmail.com>`
- **WHEN** a scan reports that change
- **THEN** the creation date is 2026-08-10 and the proposer is `fripig`

#### Scenario: One metadata field being unusable does not affect the other

- **GIVEN** a change directory whose `.openspec.yaml` contains `created: last Tuesday` and `created_by: fripig <fripig@gmail.com>`
- **WHEN** a scan reports that change
- **THEN** the creation date is unknown and the proposer is `fripig`

#### Scenario: An archived change reports its proposer rather than its archiver

- **GIVEN** an archived change whose `.openspec.yaml` records `created_by: alice <alice@example.com>` and `archived_by: bob <bob@example.com>`
- **WHEN** a scan reports that change
- **THEN** the proposer is `alice`

#### Scenario: Modification date is the newest Markdown file

- **WHEN** a scan reports a change that has Markdown files
- **THEN** the modification date is the most recent modification time among them

##### Example: newest Markdown file wins

- **GIVEN** a change containing `proposal.md` modified at 2026-08-11 17:00 and `tasks.md` modified at 2026-08-12 09:00
- **WHEN** a scan reports that change
- **THEN** the modification date is 2026-08-12 09:00

#### Scenario: A change with no Markdown files has no modification date

- **GIVEN** a change directory containing only `.openspec.yaml`
- **WHEN** a scan reports that change
- **THEN** the modification date is unknown


<!-- @trace
source: show-proposer-and-sorting
updated: 2026-09-01
code:
  - src/discovery/changeMetadata.ts
  - src/discovery/scanner.ts
  - src/discovery/model.ts
tests:
  - src/test/changeMetadata.test.ts
  - src/test/scanner.test.ts
-->

---
### Requirement: Derive task progress from tasks.md

The system SHALL derive task progress by parsing the `tasks.md` file inside a change directory. A line SHALL count toward the total when, after stripping leading whitespace, it matches a Markdown checkbox list item. A checkbox containing a single space SHALL count as incomplete, and a checkbox containing the letter `x` in either case SHALL count as complete. A checkbox containing any other content SHALL NOT count toward the total. Lines inside fenced code blocks SHALL be ignored. Content following the checkbox, including parallel-task markers, SHALL NOT affect counting.

When `tasks.md` is absent or contains no counted checkbox, the system SHALL report that no progress information is available.

#### Scenario: Mixed checkbox states are counted

- **WHEN** `tasks.md` contains a mixture of complete and incomplete checkbox items
- **THEN** the reported progress is the number of complete items and the total number of counted items

##### Example: checkbox parsing cases

| Line                             | Counted in total | Counted as complete |
| -------------------------------- | ---------------- | ------------------- |
| `- [ ] 1.1 Implement scanner`    | yes              | no                  |
| `- [x] 1.2 Write tests`          | yes              | yes                 |
| `- [X] 1.3 Update docs`          | yes              | yes                 |
| `  - [ ] 1.4 Nested subtask`     | yes              | no                  |
| `- [ ] [P] 1.5 Parallel task`    | yes              | no                  |
| `- [~] 1.6 Unknown marker`       | no               | no                  |
| `## 2. Section heading`          | no               | no                  |
| `- [ ] inside a fenced block`    | no               | no                  |

#### Scenario: No tasks file

- **WHEN** a change directory has no `tasks.md`
- **THEN** the change reports no progress information

#### Scenario: Tasks file without checkboxes

- **WHEN** `tasks.md` exists but contains no counted checkbox line
- **THEN** the change reports no progress information


<!-- @trace
source: spectra-changes-view
updated: 2026-09-01
code:
  - src/discovery/taskProgress.ts
  - src/discovery/model.ts
tests:
  - src/test/taskProgress.test.ts
-->

---
### Requirement: Derive change status from task progress

The system SHALL derive a status for each change from its task progress. When no progress information is available, the status SHALL be Draft. When the total is greater than zero and the complete count is zero, the status SHALL be Not Started. When the total is greater than zero and the complete count equals the total, the status SHALL be Complete. Otherwise the status SHALL be In Progress.

#### Scenario: Status derivation

- **WHEN** a change is reported by a scan
- **THEN** its status follows the derivation rules

##### Example: status by progress

| Complete | Total | Status      |
| -------- | ----- | ----------- |
| none     | none  | Draft       |
| 0        | 8     | Not Started |
| 3        | 8     | In Progress |
| 8        | 8     | Complete    |


<!-- @trace
source: spectra-changes-view
updated: 2026-09-01
code:
  - src/discovery/model.ts
tests:
  - src/test/model.test.ts
-->

---
### Requirement: Degrade gracefully on unreadable changes

A failure to read one change directory SHALL NOT abort the scan. The affected change SHALL be omitted from the snapshot, a warning SHALL be written to the extension's output channel, and no dialog SHALL be shown.

#### Scenario: One change directory is unreadable

- **GIVEN** three active change directories, one of which cannot be read
- **WHEN** a scan runs
- **THEN** the Active group contains the two readable changes and a warning is written to the output channel

#### Scenario: An unreadable tasks file does not omit the change

- **GIVEN** a change directory whose `tasks.md` cannot be read
- **WHEN** a scan runs
- **THEN** the change is reported with no progress information and status Draft


<!-- @trace
source: spectra-changes-view
updated: 2026-09-01
code:
  - src/discovery/scanner.ts
  - src/discovery/model.ts
  - src/extension.ts
tests:
  - src/test/scanner.test.ts
-->

---
### Requirement: Perform file system access asynchronously

The scan SHALL use asynchronous file system APIs exclusively, so that it never blocks the extension host. The discovery layer SHALL NOT import the VS Code API, so that it is exercisable by unit tests running in plain Node.

#### Scenario: Scan is requested from the view

- **WHEN** a scan is triggered by opening the view or by a refresh action
- **THEN** the file system traversal runs asynchronously and the extension host stays responsive

#### Scenario: Discovery is testable without a VS Code host

- **WHEN** a unit test invokes a scan against a temporary directory in plain Node
- **THEN** the scan runs to completion and returns a snapshot, with no VS Code test host present


<!-- @trace
source: spectra-changes-view
updated: 2026-09-01
code:
  - src/discovery/scanner.ts
  - src/discovery/gitDir.ts
  - src/discovery/taskProgress.ts
tests:
  - src/test/scanner.test.ts
-->
