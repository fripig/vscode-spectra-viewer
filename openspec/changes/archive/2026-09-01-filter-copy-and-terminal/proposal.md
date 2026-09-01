## Why

樹已經能顯示變更並排序，但只能「看」。三件日常動作仍得離開檢視：找出某個名字的變更、把變更名稱貼到別處、以及對某個變更執行 Spectra 指令。

變更累積之後，捲動找特定名稱會愈來愈慢 —— 排序解決的是「最近在動的浮上來」，解決不了「我要找那個叫 search 的」。而拿到變更名稱之後最常做的事，就是把它接在 `/spectra-apply` 後面送進終端機；目前這串字得自己一個字一個字打。

這是把參考用的 JetBrains 外掛移植完整的最後一步。

## What Changes

- 檢視提供依名稱篩選：輸入的文字以不分大小寫的方式比對變更名稱，三個群組同時套用。篩選期間群組節點同時顯示符合數與總數，避免被篩掉的變更看起來像消失了。
- 篩選只比對變更名稱。artifact 路徑不參與比對，且符合的變更其 artifact 全部保留可見。
- 選取一或多個變更節點後可複製名稱到剪貼簿，每行一個，順序依樹上由上而下。群組節點與 artifact 節點被忽略而非阻擋複製。
- 右鍵選單提供四個 Spectra 指令，各自已帶上選中的變更名稱：`/spectra-apply`、`/spectra-ingest`、`/spectra-archive`、`/spectra-commit`。
- 有作用中的終端機時，指令文字寫進該終端機的輸入位置但**不執行**，由使用者自己按 Enter；沒有作用中的終端機時，改寫入剪貼簿。選單標題明示接下來會是哪一種。

## Non-Goals

本次不採用的方案：

- **常駐的篩選輸入框。** VS Code 的 tree view 沒有可放輸入控制項的位置，要有常駐輸入框就得改用 webview、自行重寫樹狀渲染與主題。改以指令搭配輸入框驅動篩選，目前篩選字顯示在檢視標題旁。
- **沿用編輯器內建的 tree 型別搜尋。** 在樹上直接打字會比對整個節點文字，於是提案人與進度數字都會被誤中，群組也無法顯示符合數與總數。
- **沒有作用中的終端機時自動開一個。** 新開的終端機位於工作區根目錄、使用預設 shell，未必是使用者原本所在的目錄或環境，貼上去反而可能在錯的地方執行。退回剪貼簿至少不會做錯事。
- **自動執行送出的指令。** 指令只寫入輸入位置，不附換行。選錯終端機分頁的代價因此只是一行可以刪掉的文字。
- **讓提案人參與篩選比對。** 沿用上一個 change 的決定，提案人是輔助資訊而非識別依據。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `changes-view`: 新增依名稱篩選、複製變更名稱、以及送出帶變更名稱的 Spectra 指令三組行為；群組節點在篩選期間改為同時顯示符合數與總數。

## Impact

- Affected specs: `changes-view`（修改）
- Affected code:
  - New:
    - `src/view/changeFilter.ts`
    - `src/test/changeFilter.test.ts`
    - `src/view/copySelection.ts`
    - `src/test/copySelection.test.ts`
    - `src/view/spectraCommand.ts`
    - `src/test/spectraCommand.test.ts`
  - Modified:
    - `src/view/nodes.ts`
    - `src/view/changesTreeDataProvider.ts`
    - `src/extension.ts`
    - `package.json`
    - `src/test/nodes.test.ts`
    - `src/test/manifest.test.ts`
    - `README.md`
  - Removed: (none)
- 不新增任何執行期相依套件
