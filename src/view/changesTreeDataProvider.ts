import * as vscode from 'vscode'
import { isSpectraWorkspace, scanChanges } from '../discovery/scanner'
import type { ChangeSnapshot, Logger } from '../discovery/model'
import {
  ARTIFACT_ICON,
  GROUP_ICON,
  childrenOf,
  nodeId,
  progressDescription,
  rootNodes,
  statusIcon,
  type SpectraNode,
} from './nodes'

/** Context key the welcome view is gated on. */
export const INITIALISED_CONTEXT = 'spectraViewer.initialised'

export class ChangesTreeDataProvider implements vscode.TreeDataProvider<SpectraNode> {
  private snapshot: ChangeSnapshot | undefined
  private readonly changed = new vscode.EventEmitter<void>()

  readonly onDidChangeTreeData = this.changed.event

  constructor(private readonly logger: Logger) {}

  /** The first workspace folder is the project root; the rest are ignored. */
  private static projectRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  }

  getTreeItem(node: SpectraNode): vscode.TreeItem {
    const item = new vscode.TreeItem(node.label)
    item.id = nodeId(node)
    item.contextValue = node.kind

    switch (node.kind) {
      case 'group':
        item.description = String(node.count)
        item.iconPath = new vscode.ThemeIcon(GROUP_ICON)
        item.collapsibleState = vscode.TreeItemCollapsibleState.Expanded
        break
      case 'change': {
        // Left unset when there is no progress, so no placeholder is shown.
        const description = progressDescription(node.change)
        if (description !== undefined) {
          item.description = description
        }
        item.iconPath = new vscode.ThemeIcon(statusIcon(node.change.status))
        item.tooltip = node.change.path
        item.collapsibleState =
          node.change.artifacts.length === 0
            ? vscode.TreeItemCollapsibleState.None
            : vscode.TreeItemCollapsibleState.Collapsed
        break
      }
      case 'artifact':
        item.iconPath = new vscode.ThemeIcon(ARTIFACT_ICON)
        item.resourceUri = vscode.Uri.joinPath(vscode.Uri.file(node.changePath), node.relativePath)
        item.collapsibleState = vscode.TreeItemCollapsibleState.None
        // Opening goes through our own command so a deleted file warns
        // instead of raising a modal error.
        item.command = {
          command: 'spectraViewer.openArtifact',
          title: 'Open Artifact',
          arguments: [node],
        }
        break
    }

    return item
  }

  async getChildren(node?: SpectraNode): Promise<SpectraNode[]> {
    if (node !== undefined) {
      return childrenOf(node)
    }

    const root = ChangesTreeDataProvider.projectRoot()
    const initialised = await isSpectraWorkspace(root)
    await vscode.commands.executeCommand('setContext', INITIALISED_CONTEXT, initialised)
    if (!initialised || root === undefined) {
      // An empty root lets the welcome view take over.
      return []
    }

    this.snapshot ??= await scanChanges(root, this.logger)
    return rootNodes(this.snapshot)
  }

  /** Drops the cached snapshot and rescans, with a progress bar on the view. */
  async refresh(): Promise<void> {
    await vscode.window.withProgress(
      { location: { viewId: 'spectraChanges' } },
      async () => {
        const root = ChangesTreeDataProvider.projectRoot()
        this.snapshot =
          root === undefined || !(await isSpectraWorkspace(root))
            ? undefined
            : await scanChanges(root, this.logger)
      },
    )
    this.changed.fire()
  }

  dispose(): void {
    this.changed.dispose()
  }
}
