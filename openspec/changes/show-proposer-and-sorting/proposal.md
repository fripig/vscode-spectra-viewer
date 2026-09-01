## Why

樹上目前只看得到變更名稱與任務進度。誰提出了這個變更、什麼時候提的、最近一次動它是什麼時候 —— 這些都藏在 `.openspec.yaml` 與檔案的修改時間裡，得離開編輯器才查得到。

更實際的問題是順序。目前群組內固定以名稱升冪排列，於是「最近在動的變更」會散落在字母序的任意位置。變更一多，每次都得逐行掃描才找得到剛才在做的那個。參考用的 JetBrains 外掛把預設排序設為 Modified（最新在前），正是為了讓最相關的變更浮到最上面。

## What Changes

- discovery 層改為在單次讀取 `.openspec.yaml` 時，一併取得建立日期（`created`）與提案人（`created_by`）。
- discovery 層額外回報修改日期，取自該變更所有 Markdown 檔中最新的修改時間。
- 變更節點在名稱與任務進度之間顯示提案人，只顯示名字、不顯示 email。提案人未知時不顯示任何佔位文字。
- 檢視提供三選一的排序：Name、Modified、Created，預設為 Modified（最新在前）。目前選項會顯示在使用者介面上。
- 日期未知的變更一律排在最後；日期相同者以名稱升冪作為次要順序。
- 切換排序只重建樹，不重新掃描檔案系統。

## Non-Goals

延後到下一個 change：

- 依名稱篩選變更。
- 複製變更名稱到剪貼簿。
- 把 Spectra 斜線指令送進整合終端機。

本次不採用的方案：

- **把提案人納入排序或篩選的比較對象。** 提案人是輔助資訊，不是識別依據；讓它參與排序會讓同一個人提的變更黏在一起，反而更難找。
- **從 `archived_by` 推導已歸檔變更的顯示者。** 已歸檔的變更顯示的仍是「提出者」，不是「歸檔者」，否則同一個變更在歸檔前後會換人，語意不一致。
- **引入 YAML 函式庫。** `.openspec.yaml` 只需要兩個頂層純量欄位，逐行比對即可；為此增加一個執行期相依套件不划算。
- **監看檔案系統以即時更新修改日期。** 沿用上一個 change 的決定，刷新維持手動。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `change-discovery`: 每個變更額外回報建立日期、提案人與修改日期；三者皆在無法取得時回報為未知，且不得讓該變更從快照中消失。
- `changes-view`: 變更節點顯示提案人；群組內的排序從固定的名稱升冪，改為 Name／Modified／Created 三選一，預設 Modified。

## Impact

- Affected specs: `change-discovery`、`changes-view`（皆為修改）
- Affected code:
  - New:
    - `src/discovery/changeMetadata.ts`
    - `src/test/changeMetadata.test.ts`
    - `src/view/changeOrder.ts`
    - `src/test/changeOrder.test.ts`
  - Modified:
    - `src/discovery/model.ts`
    - `src/discovery/scanner.ts`
    - `src/view/nodes.ts`
    - `src/view/changesTreeDataProvider.ts`
    - `src/extension.ts`
    - `package.json`
    - `src/test/scanner.test.ts`
    - `src/test/nodes.test.ts`
    - `src/test/manifest.test.ts`
    - `README.md`
  - Removed: (none)
- 不新增任何執行期相依套件
