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
