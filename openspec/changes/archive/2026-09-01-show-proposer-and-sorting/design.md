## Context

上一個 change 建立了 discovery／view 的模組邊界：`src/discovery/` 不 import `vscode`、產出純資料 snapshot，`src/view/` 消費它。本次要加的三件事正好落在這條邊界的兩側 —— 中繼資料與修改日期屬於 discovery，提案人顯示與排序屬於 view —— 所以邊界本身不需要調整。

有兩處要留意。第一，`.openspec.yaml` 至今完全沒被讀過：上一個 change 明確把它排除在範圍外，snapshot 因此不帶建立日期也不帶提案人。第二，現有的「Order changes by name within groups」需求規定群組內固定以名稱升冪排列；本次要把它換成三選一且預設 Modified，這是既有行為的改變，不是單純追加。

參考用的 JetBrains 外掛把這兩件事拆成兩個 change 實作（`show-change-proposer` 與 `sort-and-filter-changes`）。這裡合併成一個，因為依 Created 排序與顯示提案人讀的是同一個檔案的同一次讀取，拆開反而要把讀檔邏輯做兩次。

## Goals / Non-Goals

**Goals:**

- 單次讀取 `.openspec.yaml` 同時取得 `created` 與 `created_by`，讓顯示提案人不額外增加任何檔案存取。
- 三種排序在群組內生效，預設 Modified，切換時不重新掃描檔案系統。
- 中繼資料任一欄位無法取得時，該變更仍出現在樹上。

**Non-Goals:**

- 篩選、Copy、Send to Terminal。延後到下一個 change。
- 讓提案人參與排序或未來的篩選比較。
- 引入 YAML 函式庫。
- 檔案系統監看。

## Decisions

### 逐行解析 .openspec.yaml 的兩個頂層純量欄位

`.openspec.yaml` 是 Spectra 自己產生的檔案，本次只需要 `created` 與 `created_by` 兩個頂層純量。逐行比對「欄位名 + 冒號 + 值」即可，不處理巢狀結構、多行字串或錨點。

替代方案是引入 YAML 函式庫。已否決：為兩個純量欄位增加一個執行期相依套件，會讓打包體積與供應鏈風險都變大，而換來的容錯能力在這個檔案上用不到。若日後真的需要讀取巢狀欄位，換掉這個解析器只會動到一個檔案。

檔案缺失、讀不到、欄位不存在、值為空、或值不是 ISO 日期，一律回報為未知，並且**不得**讓該變更從快照中消失。這條規則比欄位本身重要 —— 中繼資料是裝飾，變更本體不是。

### 提案人只取顯示名稱，捨棄 email

`created_by` 的值形如 `fripig <fripig@gmail.com>`。顯示名稱取第一個 `<` 之前的子字串並去除前後空白；沒有 `<` 時取整個值去除空白。結果為空字串時視為未知。

捨棄 email 有兩個理由：節點寬度有限，email 會把進度數字擠出可視範圍；而且把 email 顯示在共用畫面上沒有必要。

已歸檔的變更顯示的是 `created_by`，不是 `archived_by` —— 同一個變更在歸檔前後不該換人。

### 修改日期取自 Markdown 檔的最新修改時間

修改日期是該變更所有 `.md` 檔中最新的 `mtime`。讀不到時間的檔案排除在比較之外；一個時間都取不到時回報為未知。

用 `.md` 而非整個目錄，是因為 `.openspec.yaml` 會被 `spectra task done` 之外的操作碰到，而使用者真正在意的是「文件內容最後被改是什麼時候」。artifact 清單本來就要走訪這些檔案，取 `mtime` 不增加額外的目錄走訪。

### 排序規則放在 view，discovery 維持順序未定義

`src/view/changeOrder.ts` 提供純比較函式，不 import `vscode`，因此三種排序的規則能用 Vitest 完整測試。discovery 的契約仍是「群組內順序未定義」，不必更動。

兩種日期排序共用同一條規則：有日期的排在無日期的前面（無論方向），日期相同者以名稱升冪作為次要順序。把「未知排最後」寫成獨立於方向的規則，是為了避免使用者切到 Created 時，一批沒有中繼資料的舊變更霸佔最上方。

### 排序狀態存在記憶體，以 context key 驅動選單勾選

目前選項存在 provider 的欄位裡，並透過 context key 反映到選單的勾選狀態。切換排序只重新排列既有 snapshot 並觸發樹重繪，不呼叫掃描。

不持久化到 workspaceState：預設 Modified 已經是最有用的順序，跨 session 記住使用者上次的選擇，價值不足以換取多一份需要維護的狀態。若日後要加，改動範圍限於 provider 一處。

### 以 REMOVED 加 ADDED 取代既有的名稱排序需求

既有的「Order changes by name within groups」規定固定以名稱升冪排列。本次的「Sort changes within groups」讓 Name 成為三選一之一，且預設改為 Modified —— 這是既有行為的改變。

delta 寫成 REMOVED 加 ADDED 而非 MODIFIED，是因為需求名稱與語意都變了：前者描述「唯一的順序」，後者描述「使用者可選的順序集合」。用 MODIFIED 會讓歸檔後的 spec 讀起來像是名稱排序仍然是唯一規則。

## Implementation Contract

**行為**

變更節點的文字依序是：變更名稱、提案人、任務進度數字。提案人未知時整段不出現，且不留佔位文字，進度數字仍在最後 —— 進度的位置不隨提案人名稱長短而移動。Active、Parked、Archived 三組行為一致。

檢視標題列多一個排序選單，三個互斥選項 Name、Modified、Created，目前選中的那個帶勾選標記。首次開啟檢視時為 Modified。切換選項後樹立即重排，沒有掃描發生，展開狀態與捲動位置不受影響。

**介面與資料形狀**

每個變更額外帶三個欄位：建立日期、提案人顯示名稱、修改日期，三者皆可為未知。建立日期與提案人來自同一次 `.openspec.yaml` 讀取。

排序模組匯出三個比較函式或一個以排序種類為參數的比較函式，輸入兩個變更、輸出排序用的數值，不接觸檔案系統。

貢獻的識別碼：三個切換排序的指令、一個承載它們的 view 標題選單，以及一個反映目前選項、供選單勾選狀態使用的 context key。

**失敗模式**

- `.openspec.yaml` 缺失或讀不到：建立日期與提案人皆未知，變更照常出現。
- `created` 存在但不是 ISO 日期（例如 `last Tuesday`）：建立日期未知，提案人不受影響。
- `created_by` 存在但顯示名稱為空（例如 `<a@example.com>`）：提案人未知，建立日期不受影響。
- 變更沒有任何 `.md` 檔，或所有 `.md` 檔的修改時間都讀不到：修改日期未知。
- 依 Created 或 Modified 排序時遇到未知日期：該變更排在該群組最後。

**驗收標準**

- Vitest 涵蓋：中繼資料解析表（`created` 五種情況、`created_by` 七種情況）、兩欄位互不影響的兩個案例、修改日期取最新與全部未知的案例、三種排序各自的順序、未知日期排最後、同日期以名稱次要排序。
- 型別檢查零錯誤，esbuild 產出 bundle，打包指令產出 `.vsix`。
- Extension Development Host 手動驗證：對本 repository，變更節點顯示提案人與進度；切換三種排序後順序符合預期且無掃描發生；把某個變更的 `.openspec.yaml` 暫時改成 `created: last Tuesday`，該變更仍在樹上且排在 Created 順序的最後。

**範圍邊界**

**在範圍內**：`.openspec.yaml` 解析、修改日期、提案人顯示、三種排序與其選單。

**在範圍外**：Non-Goals 列出的全部項目。特別是本次不動 artifact 開啟、刷新、welcome 狀態與節點 id 規則 —— 節點 id 仍只由群組、變更名稱與 artifact 相對路徑推導，不含中繼資料，否則排序或中繼資料變動會讓展開狀態失效。

## Risks / Trade-offs

- **逐行解析 YAML 在檔案格式變複雜時會悄悄失效** → 解析器只認頂層「欄位名: 值」，讀不到就回報未知而非猜測，因此失效的表現是「提案人不顯示」而不是「顯示錯的人」。中繼資料解析表把每種畸形輸入都釘成測試案例。
- **修改日期依賴檔案系統的 mtime，而 git checkout 會把它重設成 checkout 當下的時間** → 這是 mtime 的固有性質，參考外掛也是如此。使用者若剛 clone 完看到所有變更的修改日期都相同，屬預期行為；Created 排序不受影響，可作為替代。
- **預設排序從 Name 改成 Modified，是既有行為的改變** → 這正是本次的目的，且 delta 寫成 REMOVED 加 ADDED 讓這個改變在歸檔後的 spec 裡清楚可見，而非藏在措辭修改裡。
- **排序狀態不持久化，每次開新視窗都回到 Modified** → Modified 是刻意選的預設值，也是多數情況下最有用的順序，因此回到它的成本很低。
- **提案人加長了節點文字，在窄側邊欄可能被截斷** → 提案人放在名稱與進度之間，且與進度同樣以 de-emphasised 樣式呈現；截斷時先被截掉的是提案人而非變更名稱。
