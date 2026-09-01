import { join } from 'node:path'
import * as vscode from 'vscode'
import { ChangesTreeDataProvider } from './view/changesTreeDataProvider'
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

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('Spectra')
  const provider = new ChangesTreeDataProvider({
    warn: (message) => output.appendLine(`[warn] ${message}`),
  })

  context.subscriptions.push(
    output,
    provider,
    vscode.window.createTreeView('spectraChanges', {
      treeDataProvider: provider,
      showCollapseAll: true,
    }),
    vscode.commands.registerCommand('spectraViewer.refresh', () => provider.refresh()),
    vscode.commands.registerCommand('spectraViewer.openArtifact', openArtifact),
  )
}

export function deactivate(): void {
  // Everything is disposed through context.subscriptions.
}
