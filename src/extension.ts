import { join } from 'node:path'
import * as vscode from 'vscode'
import { ChangeOrder } from './view/changeOrder'
import { ChangesTreeDataProvider, ORDER_CONTEXT } from './view/changesTreeDataProvider'
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
  })

  // Two reinforcing signals for the current sort: the description states it,
  // and the menu offers only the options not already in effect.
  const applyOrder = (order: ChangeOrder): void => {
    provider.setOrder(order)
    treeView.description = `Sort: ${ORDER_LABELS[order]}`
    void vscode.commands.executeCommand('setContext', ORDER_CONTEXT, order)
  }
  applyOrder(provider.currentOrder)

  context.subscriptions.push(
    output,
    provider,
    treeView,
    vscode.commands.registerCommand('spectraViewer.refresh', () => provider.refresh()),
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
