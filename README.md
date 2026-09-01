# Spectra Viewer

在 VS Code 裡瀏覽你的 [Spectra](https://spectra.5xcamp.us/) 變更，不必切換到終端機。

Spectra 會把暫存（parked）的變更移出 `openspec/changes/`、放進 git 目錄底下，於是它們在檔案總管裡完全看不見。這個擴充在活動列加上一個 **Spectra** 檢視，把 Active、Parked、Archived 三組變更並列出來，顯示各自的任務進度，並讓你直接點開它們的 Markdown 文件。

擴充只讀檔案。它**不需要 Spectra 應用程式在執行**，也從不碰 Spectra 的內部資料庫。

> **非官方專案**：這是社群自建的第三方擴充，與 Spectra 官方無關，亦未經其背書。所有 Spectra 相關名稱均屬其各自擁有者。

## 功能

- **三組並列**：Active（`openspec/changes/`）、Parked（git 目錄下的 `spectra-app/changes/`）、Archived（`openspec/changes/archive/`）。群組節點顯示變更數量，數量為零時節點依然存在。
- **任務進度**：解析每個變更的 `tasks.md`，在節點上顯示「已完成／總計」。圍籬程式碼區塊裡的 checkbox 會被忽略。
- **狀態圖示**：由任務進度推導出 Draft、Not Started、In Progress、Complete 四種狀態，各自對應不同圖示。
- **開啟文件**：點擊 artifact 節點即在編輯器開啟該 Markdown。檔案若已被刪除，會得到一則非阻斷式警告，而不是錯誤對話框。
- **重新整理**：標題列的 Refresh 會重新掃描；展開狀態會保留。
- **git worktree 支援**：`.git` 是檔案時，會依 `gitdir:` 與 `commondir` 解析出真正的 git 目錄，並從那裡找出暫存的變更。

掃描一律非同步執行，不會阻塞編輯器。

## 安裝

尚未上架 Marketplace。目前請從原始碼安裝：

```bash
npm install
npx vsce package          # 產出 vscode-spectra-viewer-0.1.0.vsix
code --install-extension vscode-spectra-viewer-0.1.0.vsix
```

Cursor 等 VS Code 分支同樣適用 —— 把 `code` 換成該編輯器的 CLI 即可。

需求：VS Code 1.90 以上。

## 尚未提供

以下功能在參考用的 JetBrains 外掛裡有，但這個版本**還沒有**，將由後續版本補上：

- 顯示提案人（`.openspec.yaml` 的 `created_by`）
- 依 Name／Modified／Created 排序
- 依名稱篩選
- 複製變更名稱到剪貼簿
- 把 `/spectra-apply` 等指令送進整合終端機

另外，多根工作區只會掃描**第一個**資料夾。

## 開發

```bash
npm install
npm run compile      # esbuild 打包到 dist/
npm run check-types  # tsc --noEmit
npm test             # Vitest 單元測試
```

按 <kbd>F5</kbd> 會開啟 Extension Development Host 試跑。

`src/discovery/` 完全不 import `vscode`，所以整層邏輯都能用 Vitest 在純 Node 環境測試，不需要 VS Code test host。

```
src/
├── discovery/   # 檔案系統掃描、解析 tasks.md、git 目錄解析
├── view/        # 樹狀節點模型與 TreeDataProvider
└── test/        # Vitest 單元測試
openspec/        # Spectra 規格（本專案自己也用 SDD 開發）
```

## 授權

[MIT](LICENSE) © fripig
