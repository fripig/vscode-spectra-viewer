# Spectra Viewer

*[English](README.md) · 繁體中文*

在 VS Code 裡瀏覽你的 [Spectra](https://spectra.5xcamp.us/) 變更，不必切換到終端機。

Spectra 會把暫存（parked）的變更移出 `openspec/changes/`、放進 git 目錄底下，於是它們在檔案總管裡完全看不見。這個擴充在活動列加上一個 **Spectra** 檢視，把 Active、Parked、Archived 三組變更並列出來，顯示各自的任務進度，並讓你直接點開它們的 Markdown 文件。

擴充只讀檔案。它**不需要 Spectra 應用程式在執行**，也從不碰 Spectra 的內部資料庫。

> **非官方專案**：這是社群自建的第三方擴充，與 Spectra 官方無關，亦未經其背書。所有 Spectra 相關名稱均屬其各自擁有者。

## 功能

- **三組並列**：Active（`openspec/changes/`）、Parked（git 目錄下的 `spectra-app/changes/`）、Archived（`openspec/changes/archive/`）。群組節點顯示變更數量，數量為零時節點依然存在。
- **任務進度**：解析每個變更的 `tasks.md`，在節點上顯示「已完成／總計」。圍籬程式碼區塊裡的 checkbox 會被忽略。
- **狀態圖示**：由任務進度推導出 Draft、Not Started、In Progress、Complete 四種狀態，各自對應不同圖示。
- **提案人**：讀取每個變更 `.openspec.yaml` 的 `created_by`，顯示在變更名稱與任務進度之間，三個群組皆適用。只顯示名字、不顯示 email；沒有可用名字時不顯示任何佔位文字。已歸檔的變更顯示的是提出者，不是歸檔者。
- **排序**：Name、Modified、Created 三選一，預設 Modified（最新在前）。目前選項顯示在檢視標題旁，選單只列出可切換的選項。日期未知的變更一律排在最後，日期相同者以名稱升冪排列。切換排序只重建樹，不重新掃描檔案系統。
- **依名稱篩選**：標題列的篩選按鈕開啟輸入框，輸入的文字以不分大小寫的方式比對變更名稱，三個群組同時套用；篩選期間群組節點同時顯示符合數與總數，被篩掉的變更不會被誤讀為不存在。只比對名稱，artifact 路徑與提案人都不參與，符合的變更其 artifact 全部保留。清空輸入即取消篩選。
- **複製變更名稱**：選取一或多個變更後按複製鍵，或用右鍵選單，剪貼簿得到那些名稱，每行一個。只有名稱 —— 不含群組、提案人與進度數字。快捷鍵只在這個檢視有焦點時生效。
- **送出 Spectra 指令**：右鍵變更選 **Spectra Command…**，挑一個已經帶好變更名稱的完整指令（`/spectra-apply`、`/spectra-ingest`、`/spectra-archive`、`/spectra-commit`）。指令會寫進你當下的終端機但**不會被執行** —— 停在輸入位置等你自己按 Enter，所以選錯分頁的代價只是一行可以刪掉的文字。沒有作用中的終端機時改寫入剪貼簿，選單標題會告訴你接下來是哪一種。
- **開啟文件**：點擊 artifact 節點即在編輯器開啟該 Markdown。檔案若已被刪除，會得到一則非阻斷式警告，而不是錯誤對話框。
- **重新整理**：標題列的 Refresh 會重新掃描；展開狀態會保留。
- **git worktree 支援**：`.git` 是檔案時，會依 `gitdir:` 與 `commondir` 解析出真正的 git 目錄，並從那裡找出暫存的變更。

掃描一律非同步執行，不會阻塞編輯器。

## 安裝

尚未上架 Marketplace。請到 [最新 release](https://github.com/fripig/vscode-spectra-viewer/releases/latest) 下載 `.vsix` 後安裝：

```bash
code --install-extension spectra-viewer-0.1.0.vsix
```

或在編輯器裡操作：<kbd>Cmd/Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> → **Extensions: Install from VSIX…** → 選那個檔案。

Cursor 等 VS Code 分支同樣適用 —— 把 `code` 換成該編輯器的 CLI 即可。macOS 上這些 CLI 常不在 `PATH` 裡，Cursor 的位於 `/Applications/Cursor.app/Contents/Resources/app/bin/cursor`。

想自己建置的話：

```bash
npm install
npx vsce package          # 產出 vscode-spectra-viewer-<version>.vsix
```

需求：VS Code 1.90 以上。

## 與 JetBrains 版的差異

參考用的 JetBrains 外掛的功能都已移植完成。兩處刻意的行為差異：

- **篩選是「輸入後套用」，不是邊打邊縮。** VS Code 的 tree view 沒有可放輸入控制項的位置，所以篩選由指令搭配輸入框驅動。目前篩選字持續顯示在檢視標題旁。
- **多根工作區只掃描第一個資料夾。**

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

CI 會在 Node 20.9 與 22 上跑型別檢查、測試與打包。測舊版是刻意的：20.9 正是 VS Code 1.90 extension host 內建的 Node，在那裡不存在的 API 會讓建置失敗，而不是讓使用者的編輯器失敗。

## 授權

[MIT](LICENSE) © fripig
