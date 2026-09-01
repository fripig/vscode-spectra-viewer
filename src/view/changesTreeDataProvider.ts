import * as vscode from 'vscode'
import { isSpectraWorkspace, scanChanges } from '../discovery/scanner'
import type { ChangeSnapshot, Logger } from '../discovery/model'
import { ChangeOrder, DEFAULT_ORDER } from './changeOrder'
import {
  ARTIFACT_ICON,
  GROUP_ICON,
  groupCountLabel,
  childrenOf,
  nodeId,
  nodeDescription,
  rootNodes,
  statusIcon,
  type SpectraNode,
} from './nodes'

/** Context key the welcome view is gated on. */
export const INITIALISED_CONTEXT = 'spectraViewer.initialised'
/** Context key the sort menu reads to hide the option already in effect. */
export const ORDER_CONTEXT = 'spectraViewer.order'

export class ChangesTreeDataProvider implements vscode.TreeDataProvider<SpectraNode> {
  private snapshot: ChangeSnapshot | undefined
  private order: ChangeOrder = DEFAULT_ORDER
  private filter = ''
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
        item.description = groupCountLabel(node)
        item.iconPath = new vscode.ThemeIcon(GROUP_ICON)
        item.collapsibleState = vscode.TreeItemCollapsibleState.Expanded
        break
      case 'change': {
        // Proposer then counts; left unset entirely when neither exists, so
        // no placeholder is shown.
        const description = nodeDescription(node.change)
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
      return childrenOf(node, this.order)
    }

    const root = ChangesTreeDataProvider.projectRoot()
    const initialised = await isSpectraWorkspace(root)
    await vscode.commands.executeCommand('setContext', INITIALISED_CONTEXT, initialised)
    if (!initialised || root === undefined) {
      // An empty root lets the welcome view take over.
      return []
    }

    this.snapshot ??= await scanChanges(root, this.logger)
    return rootNodes(this.snapshot, this.filter)
  }

  get currentOrder(): ChangeOrder {
    return this.order
  }

  get currentFilter(): string {
    return this.filter
  }

  /**
   * Applies a name filter and rebuilds the tree from the snapshot in hand —
   * filtering, like sorting, never touches the file system. A refresh keeps
   * whatever filter is set, so it survives a rescan.
   */
  setFilter(filter: string): void {
    if (filter === this.filter) {
      return
    }
    this.filter = filter
    this.changed.fire()
  }

  /**
   * Switches the sort option and rebuilds the tree from the snapshot already
   * in hand — changing the order never touches the file system.
   */
  setOrder(order: ChangeOrder): void {
    if (order === this.order) {
      return
    }
    this.order = order
    this.changed.fire()
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
