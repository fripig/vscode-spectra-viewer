import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = join(__dirname, '..', '..')

async function manifest(): Promise<Record<string, any>> {
  return JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8'))
}

describe('Provide a Spectra view', () => {
  it('contributes a Spectra view container to the activity bar', async () => {
    const containers = (await manifest()).contributes?.viewsContainers?.activitybar
    expect(containers).toHaveLength(1)
    expect(containers[0]).toMatchObject({ id: 'spectra', title: 'Spectra' })
  })

  it('ships the view container icon it declares', async () => {
    const icon = (await manifest()).contributes.viewsContainers.activitybar[0].icon
    expect(existsSync(join(projectRoot, icon))).toBe(true)
  })

  it('holds a single Changes view inside that container', async () => {
    const views = (await manifest()).contributes?.views?.spectra
    expect(views).toHaveLength(1)
    expect(views[0]).toMatchObject({ id: 'spectraChanges', name: 'Changes' })
  })

  it('activates on the view rather than on editor startup', async () => {
    const events: string[] = (await manifest()).activationEvents ?? []
    expect(events).toContain('onView:spectraChanges')
    expect(events).not.toContain('*')
    expect(events).not.toContain('onStartupFinished')
  })
})

describe('Refresh on demand / Open artifact files in the editor', () => {
  it('contributes a refresh command and an open-artifact command', async () => {
    const commands: Array<{ command: string }> = (await manifest()).contributes?.commands ?? []
    const ids = commands.map((c) => c.command)

    expect(ids).toContain('spectraViewer.refresh')
    expect(ids).toContain('spectraViewer.openArtifact')
  })

  it('puts Refresh in the view title bar, and keeps openArtifact out of the palette', async () => {
    const menus = (await manifest()).contributes?.menus ?? {}
    const titleItems: Array<{ command: string; when?: string; group?: string }> =
      menus['view/title'] ?? []
    const refresh = titleItems.find((i) => i.command === 'spectraViewer.refresh')

    expect(refresh).toBeDefined()
    expect(refresh!.when).toContain('spectraChanges')
    expect(refresh!.group).toContain('navigation')

    const palette: Array<{ command: string; when?: string }> = menus['commandPalette'] ?? []
    const hidden = palette.find((i) => i.command === 'spectraViewer.openArtifact')
    expect(hidden?.when).toBe('false')
  })
})

describe('Indicate loading and uninitialised states', () => {
  it('shows a welcome view gated on the workspace not being initialised', async () => {
    const welcome: Array<{ view: string; when?: string; contents: string }> =
      (await manifest()).contributes?.viewsWelcome ?? []
    const entry = welcome.find((w) => w.view === 'spectraChanges')

    expect(entry).toBeDefined()
    expect(entry!.when).toBe('!spectraViewer.initialised')
    expect(entry!.contents).toMatch(/openspec/i)
  })
})

describe('Sort changes within groups — manifest contributions', () => {
  const SORT_COMMANDS = [
    'spectraViewer.sortByName',
    'spectraViewer.sortByModified',
    'spectraViewer.sortByCreated',
  ]
  const ORDER_CONTEXT = 'spectraViewer.order'

  it('contributes exactly one command per sort option', async () => {
    const ids: string[] = ((await manifest()).contributes?.commands ?? []).map(
      (c: { command: string }) => c.command,
    )

    for (const command of SORT_COMMANDS) {
      expect(ids).toContain(command)
    }
  })

  it('puts every sort option in the Changes view title menu', async () => {
    const titleItems: Array<{ command: string; when?: string; group?: string }> =
      ((await manifest()).contributes?.menus ?? {})['view/title'] ?? []

    for (const command of SORT_COMMANDS) {
      const item = titleItems.find((i) => i.command === command)
      expect(item, `${command} must appear in view/title`).toBeDefined()
      expect(item!.when).toContain('spectraChanges')
    }
  })

  it('gates each sort option checkmark on the order context key', async () => {
    const titleItems: Array<{ command: string; when?: string }> =
      ((await manifest()).contributes?.menus ?? {})['view/title'] ?? []
    const whens = SORT_COMMANDS.map((c) => titleItems.find((i) => i.command === c)!.when!)

    for (const when of whens) {
      expect(when).toContain(ORDER_CONTEXT)
    }
    // Mutually exclusive: no two options can be checked by the same condition.
    expect(new Set(whens).size).toBe(SORT_COMMANDS.length)
  })
})

describe('Filter changes by name — manifest contributions', () => {
  it('contributes a filter command', async () => {
    const ids: string[] = ((await manifest()).contributes?.commands ?? []).map(
      (c: { command: string }) => c.command,
    )

    expect(ids).toContain('spectraViewer.setFilter')
  })

  it('puts the filter command in the Changes view title bar', async () => {
    const titleItems: Array<{ command: string; when?: string; group?: string }> =
      ((await manifest()).contributes?.menus ?? {})['view/title'] ?? []
    const filter = titleItems.find((i) => i.command === 'spectraViewer.setFilter')

    expect(filter).toBeDefined()
    expect(filter!.when).toContain('spectraChanges')
    expect(filter!.group).toContain('navigation')
  })

  it('gives the filter command an icon so it is visible in the title bar', async () => {
    const command = ((await manifest()).contributes?.commands ?? []).find(
      (c: { command: string }) => c.command === 'spectraViewer.setFilter',
    )

    expect(command.icon).toBeDefined()
  })
})

describe('Copy change names to the clipboard — manifest contributions', () => {
  it('contributes a copy command', async () => {
    const ids: string[] = ((await manifest()).contributes?.commands ?? []).map(
      (c: { command: string }) => c.command,
    )

    expect(ids).toContain('spectraViewer.copyChangeName')
  })

  it('offers the copy command on the tree context menu', async () => {
    const items: Array<{ command: string; when?: string }> =
      ((await manifest()).contributes?.menus ?? {})['view/item/context'] ?? []
    const copy = items.find((i) => i.command === 'spectraViewer.copyChangeName')

    expect(copy).toBeDefined()
    expect(copy!.when).toContain('spectraChanges')
  })

  it('binds copy to a shortcut that only applies while the tree has focus', async () => {
    const bindings: Array<{ command: string; key: string; mac?: string; when?: string }> =
      (await manifest()).contributes?.keybindings ?? []
    const copy = bindings.find((b) => b.command === 'spectraViewer.copyChangeName')

    expect(copy).toBeDefined()
    expect(copy!.when).toContain('focusedView == spectraChanges')
    expect(copy!.key).toBeTruthy()
  })
})

describe('Send a Spectra command — manifest contributions', () => {
  it('contributes a single command that opens the command picker', async () => {
    const ids: string[] = ((await manifest()).contributes?.commands ?? []).map(
      (c: { command: string }) => c.command,
    )

    expect(ids).toContain('spectraViewer.sendCommand')
  })

  it('offers the picker on the tree context menu, for change nodes only', async () => {
    const items: Array<{ command?: string; when?: string }> =
      ((await manifest()).contributes?.menus ?? {})['view/item/context'] ?? []
    const send = items.find((i) => i.command === 'spectraViewer.sendCommand')

    expect(send).toBeDefined()
    expect(send!.when).toContain('spectraChanges')
    expect(send!.when).toContain('viewItem == change')
  })

  it('declares no submenus, since the picker carries the titles instead', async () => {
    expect((await manifest()).contributes?.submenus ?? []).toEqual([])
  })

  it('declares no per-slash-command entries in the manifest', async () => {
    const ids: string[] = ((await manifest()).contributes?.commands ?? []).map(
      (c: { command: string }) => c.command,
    )

    // Item texts carry the change name, so they cannot live in a static manifest.
    for (const stale of ['sendApply', 'sendIngest', 'sendArchive', 'sendCommit']) {
      expect(ids).not.toContain(`spectraViewer.${stale}`)
    }
  })
})
