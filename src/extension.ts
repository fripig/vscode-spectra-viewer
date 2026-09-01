import { join } from 'node:path'
import * as vscode from 'vscode'
import { ChangeOrder } from './view/changeOrder'
import { ChangesTreeDataProvider, ORDER_CONTEXT } from './view/changesTreeDataProvider'
import { copyText, soleChange } from './view/copySelection'
import { SPECTRA_COMMANDS, commandText } from './view/spectraCommand'
import type { SpectraNode } from './view/nodes'
import type { ArtifactNode } from './view/nodes'

async function openArtifact(node: ArtifactNode): Promise<void> {
  const uri = vscode.Uri.file(join(node.changePath, node.relativePath))
  try {
    await vscode.workspace.fs.stat(uri)
  } catch {
    // Non-blocking: the node is stale, the view stays usable.
    void vscode.window.showWarningMessage(
      `Spectra: ${node.relativePath} is no longer on disk. Refresh the view.`,
    )
    return
  }
  await vscode.window.showTextDocument(uri, { preview: true })
}

/** Human-readable label for the sort option shown beside the view title. */
const ORDER_LABELS: Readonly<Record<ChangeOrder, string>> = {
  [ChangeOrder.Name]: 'Name',
  [ChangeOrder.Modified]: 'Modified',
  [ChangeOrder.Created]: 'Created',
}

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('Spectra')
  const provider = new ChangesTreeDataProvider({
    warn: (message) => output.appendLine(`[warn] ${message}`),
  })

  const treeView = vscode.window.createTreeView('spectraChanges', {
    treeDataProvider: provider,
    showCollapseAll: true,
    canSelectMany: true,
  })

  /**
   * The tree hands the invoked node first and the whole selection second;
   * a keyboard invocation supplies neither, so fall back to the live selection.
   */
  const selectionOf = (node?: SpectraNode, selected?: SpectraNode[]): SpectraNode[] =>
    selected ?? (node === undefined ? [...treeView.selection] : [node])

  const copySelection = async (node?: SpectraNode, selected?: SpectraNode[]): Promise<void> => {
    const text = copyText(selectionOf(node, selected))
    // Nothing copyable: leave whatever the user had on the clipboard.
    if (text === undefined) {
      return
    }
    await vscode.env.clipboard.writeText(text)
  }

  // The description carries both pieces of view state, so neither the sort
  // nor an active filter can be forgotten about.
  const describeState = (): void => {
    const filter = provider.currentFilter.trim()
    const sort = `Sort: ${ORDER_LABELS[provider.currentOrder]}`
    treeView.description = filter === '' ? sort : `${sort} · Filter: ${filter}`
  }

  // Two reinforcing signals for the current sort: the description states it,
  // and the menu offers only the options not already in effect.
  const applyOrder = (order: ChangeOrder): void => {
    provider.setOrder(order)
    void vscode.commands.executeCommand('setContext', ORDER_CONTEXT, order)
    describeState()
  }
  applyOrder(provider.currentOrder)

  const promptForFilter = async (): Promise<void> => {
    const filter = await vscode.window.showInputBox({
      title: 'Filter Spectra changes',
      prompt: 'Show only changes whose name contains this text. Leave empty to clear.',
      placeHolder: 'e.g. search',
      value: provider.currentFilter,
    })
    // Undefined means the user dismissed the box; leave the filter as it was.
    if (filter === undefined) {
      return
    }
    provider.setFilter(filter)
    describeState()
  }

  /**
   * Offers the four Spectra commands, each already carrying the change name,
   * and hands the chosen one to the terminal — or to the clipboard when there
   * is none.
   *
   * A picker rather than a submenu because both the title and the item texts
   * have to state the truth of the moment: which change, and where the text
   * is about to go. Manifest menus can carry neither.
   *
   * The text is written to the input position without a newline and is never
   * executed: pick the wrong terminal tab and the cost is one line you can
   * delete. A terminal that throws falls back to the clipboard rather than
   * losing the command.
   */
  const sendCommand = async (node?: SpectraNode, selected?: SpectraNode[]): Promise<void> => {
    const change = soleChange(selectionOf(node, selected))
    if (change === undefined) {
      return
    }

    const hasTerminal = vscode.window.activeTerminal !== undefined
    const picked = await vscode.window.showQuickPick(
      SPECTRA_COMMANDS.map((slash) => commandText(slash, change.name)),
      {
        title: hasTerminal ? 'Send to Terminal' : 'Copy Command',
        placeHolder: hasTerminal
          ? 'Written to the active terminal, not executed'
          : 'No active terminal — copied to the clipboard instead',
      },
    )
    if (picked === undefined) {
      return
    }

    // Re-checked here, not when the picker opened: the terminal may have gone.
    const terminal = vscode.window.activeTerminal
    if (terminal !== undefined) {
      try {
        terminal.sendText(picked, false)
        terminal.show(false)
        return
      } catch (error) {
        output.appendLine(`[warn] Could not write to the terminal: ${String(error)}`)
      }
    }
    await vscode.env.clipboard.writeText(picked)
  }

  context.subscriptions.push(
    output,
    provider,
    treeView,
    vscode.commands.registerCommand('spectraViewer.refresh', () => provider.refresh()),
    vscode.commands.registerCommand('spectraViewer.setFilter', promptForFilter),
    vscode.commands.registerCommand('spectraViewer.copyChangeName', copySelection),
    vscode.commands.registerCommand('spectraViewer.sendCommand', sendCommand),
    vscode.commands.registerCommand('spectraViewer.openArtifact', openArtifact),
    vscode.commands.registerCommand('spectraViewer.sortByName', () => applyOrder(ChangeOrder.Name)),
    vscode.commands.registerCommand('spectraViewer.sortByModified', () =>
      applyOrder(ChangeOrder.Modified),
    ),
    vscode.commands.registerCommand('spectraViewer.sortByCreated', () =>
      applyOrder(ChangeOrder.Created),
    ),
  )
}

export function deactivate(): void {
  // Everything is disposed through context.subscriptions.
}
