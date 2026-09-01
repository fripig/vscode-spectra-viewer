import { describe, expect, it } from 'vitest'
import { ChangeStatus, deriveStatus, type TaskProgress } from '../discovery/model'

describe('Derive change status from task progress', () => {
  // One row per line of the spec's "status by progress" example table.
  const cases: Array<[TaskProgress | undefined, ChangeStatus]> = [
    [undefined, ChangeStatus.Draft],
    [{ complete: 0, total: 8 }, ChangeStatus.NotStarted],
    [{ complete: 3, total: 8 }, ChangeStatus.InProgress],
    [{ complete: 8, total: 8 }, ChangeStatus.Complete],
  ]

  it.each(cases)('progress %j yields %s', (progress, expected) => {
    expect(deriveStatus(progress)).toBe(expected)
  })
})
