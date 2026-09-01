## Why

Spectra 會把 parked changes 從 `openspec/changes/` 移到 git 目錄底下，於是它們在 VS Code 的檔案總管裡完全看不見。目前沒有任何方法能同時看到 Active、Parked、Archived 三組變更，也無法一眼判斷某個變更做到哪裡 —— 只能離開編輯器去敲 CLI。

JetBrains 端已經有對應的解法（`idea-spectra-viewer`，已上架 JetBrains Marketplace）。它的兩份 spec —— `change-discovery` 與 `changes-tool-window` —— 就是本次移植所依據的、已驗證過的行為契約。VS Code 與 Cursor 使用者目前沒有等價工具。

## What Changes

- 建立一個全新的 VS Code extension 骨架：TypeScript、esbuild 打包、Vitest 單元測試。
- 新增 discovery 層，直接讀檔案系統找出三個位置的 Spectra 變更，並回報每個變更的 artifact 清單、任務進度與推導出的狀態。它不呼叫 `spectra` CLI，也不讀 Spectra 的內部資料庫。
- 在 activity bar 新增 **Spectra** view container，內含一個 **Changes** 樹狀檢視。樹的第一層固定是 Active、Parked、Archived 三個群組節點並各自顯示變更數量，第二層是變更節點，第三層是 Markdown artifact 節點。
- 變更節點顯示從 `tasks.md` 解析出的已完成／總計任務數。
- 點擊 artifact 節點會在編輯器分頁開啟該 Markdown 檔。
- 檢視標題列提供 Refresh 動作，重新掃描並重建樹。
- 工作區沒有 `openspec` 目錄時，顯示 welcome 訊息而非空樹。

## Non-Goals

刻意延後到後續 change，讓本次維持在可交付的最小完整品：

- 讀取 `.openspec.yaml` 的 `created` 與 `created_by`，以及在變更節點顯示提案人。
- 群組內依 Name、Modified、Created 排序。
- 依名稱篩選變更。
- 複製變更名稱到剪貼簿。
- 把 Spectra 斜線指令送進整合終端機。

本次與後續都不採用的方案：

- **以 webview 實作樹狀檢視。** 它能提供常駐的篩選輸入框（原生 tree view 做不到），但代價是自己重寫樹狀渲染、主題色與鍵盤操作。改採原生 tree view；篩選輸入框的代價由後續 change 支付 —— 改以指令搭配 `showInputBox` 驅動篩選，而非內嵌文字框。
- **用 file system watcher 自動刷新。** Parked changes 位於解析後的 git 目錄、在工作區之外，VS Code 的 watcher 在那裡很難處理；而且變更實作期間 `tasks.md` 會被持續改寫。刷新維持手動。
- **支援多根工作區。** 只掃描第一個 workspace folder。要支援多個就得在樹上多一層 workspace folder 節點，並改變其餘每條需求所依賴的 snapshot 形狀。
- **呼叫 `spectra` CLI 或讀取其資料庫。** 本擴充只讀檔案，因此不需要任何 Spectra 行程在跑。

## Capabilities

### New Capabilities

- `change-discovery`: 在磁碟上定位 Spectra 變更，並回報其名稱、群組、artifact 清單、任務進度與推導狀態；不依賴 VS Code API。
- `changes-view`: 把 discovery 產出的 snapshot 呈現為 VS Code 樹狀檢視，並處理開啟 artifact、刷新，以及載入中與未初始化兩種狀態。

### Modified Capabilities

(none)

## Impact

- Affected specs: `change-discovery`、`changes-view`（皆為新增）
- Affected code:
  - New:
    - `package.json`
    - `tsconfig.json`
    - `esbuild.mjs`
    - `vitest.config.ts`
    - `.vscodeignore`
    - `resources/spectra.svg`
    - `src/extension.ts`
    - `src/discovery/model.ts`
    - `src/discovery/gitDir.ts`
    - `src/discovery/taskProgress.ts`
    - `src/discovery/scanner.ts`
    - `src/view/nodes.ts`
    - `src/view/changesTreeDataProvider.ts`
    - `src/test/model.test.ts`
    - `src/test/gitDir.test.ts`
    - `src/test/taskProgress.test.ts`
    - `src/test/scanner.test.ts`
    - `README.md`
  - Modified: (none)
  - Removed: (none)
- 新增依賴：`typescript`、`esbuild`、`vitest`、`@types/vscode`、`@types/node`
- 最低 VS Code 版本：1.90
- 同樣可安裝於 Cursor 等 VS Code 分支 —— 它們讀 Open VSX 而非 VS Code Marketplace
