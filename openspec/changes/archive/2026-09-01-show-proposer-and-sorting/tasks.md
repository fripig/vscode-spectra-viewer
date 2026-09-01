## 1. 中繼資料解析

- [x] 1.1 實作 **逐行解析 .openspec.yaml 的兩個頂層純量欄位**：單次讀取即回傳建立日期與提案人原始值；欄位不存在、值為空、檔案缺失或讀不到時，兩者各自獨立回報為未知，且不拋出例外。驗證方式：`src/test/changeMetadata.test.ts` 涵蓋建立日期五種情況表與檔案缺失案例。
- [x] 1.2 實作 **提案人只取顯示名稱，捨棄 email**：值含 `<` 時取其前方子字串並去除前後空白，不含 `<` 時取整個值去除空白，結果為空字串視為未知；顯示名稱絕不包含 email，也絕不取自 `archived_by`。驗證方式：`src/test/changeMetadata.test.ts` 涵蓋提案人七列對照表，外加一個同時含 `created_by` 與 `archived_by` 的已歸檔案例。

## 2. Discovery 層回報

- [x] 2.1 實作 **修改日期取自 Markdown 檔的最新修改時間**：修改日期為該變更所有 `.md` 檔中最新的 mtime，讀不到時間的檔案排除在比較外，一個都取不到時回報未知；取得 mtime 不增加額外的目錄走訪。驗證方式：`src/test/scanner.test.ts` 斷言兩檔案中較新者勝出，以及只有 `.openspec.yaml` 的變更修改日期為未知。
- [x] 2.2 **Report per-change metadata**：每個變更的回報欄位擴充為含建立日期、提案人與修改日期，三者皆可為未知；任一欄位無法取得都不得讓該變更從快照中消失，且建立日期與提案人來自同一次 `.openspec.yaml` 讀取。驗證方式：`src/test/scanner.test.ts` 斷言兩欄位一起讀出的案例、一個欄位畸形不影響另一個的案例，以及 `.openspec.yaml` 缺失時變更仍在快照中。

## 3. 排序規則

- [x] 3.1 實作 **排序規則放在 view，discovery 維持順序未定義**：新增純比較模組，以排序種類為參數回傳比較結果，不 import `vscode`、不接觸檔案系統；Name 為不分大小寫升冪，Modified 與 Created 為日期新者在前。驗證方式：`src/test/changeOrder.test.ts` 涵蓋 spec 中三種排序的完整順序範例，以及 Name 的大小寫不敏感案例。
- [x] 3.2 補齊兩種日期排序的共用規則：日期未知者無論方向一律排在最後，日期相同者以名稱升冪作為次要順序。驗證方式：`src/test/changeOrder.test.ts` 斷言有日期者全部排在無日期者之前，以及兩個同日期變更依名稱排列。

## 4. 檢視呈現

- [x] 4.1 **Show the proposer on change nodes**：提案人顯示在變更名稱與任務進度之間，與進度同為 de-emphasised 樣式；提案人未知時整段不出現且不留佔位文字，進度數字位置不隨提案人名稱長短移動；Active、Parked、Archived 三組行為一致。驗證方式：`src/test/nodes.test.ts` 涵蓋節點文字四列對照表，以及三個群組各一個變更皆顯示提案人的案例。
- [x] 4.2 **Sort changes within groups** 取代既有的 **Order changes by name within groups** —— 對應設計決策「以 REMOVED 加 ADDED 取代既有的名稱排序需求」：固定的名稱升冪不再是唯一順序，Name 成為三選一之一而預設改為 Modified。群組內依目前排序選項排列，三個群組本身的順序不變，切換選項只重排既有 snapshot、不觸發檔案系統掃描。驗證方式：`src/test/nodes.test.ts` 斷言指定排序選項後群組內的順序，以及三個群組節點順序恆為 Active、Parked、Archived。
- [x] 4.3 實作 **排序狀態存在記憶體，以 context key 驅動選單勾選**：manifest 貢獻三個切換排序的指令與承載它們的 view 標題選單，目前選項透過 context key 反映為勾選標記，首次開啟檢視時為 Modified。驗證方式：`src/test/manifest.test.ts` 斷言三個指令存在、選單項目綁在 `spectraChanges` 上、且勾選狀態的 when 條件引用該 context key。

## 5. 文件

- [x] 5.1 README 補上提案人顯示與三種排序的說明，載明預設為 Modified 且日期未知者排最後，並從「尚未提供」清單移除這兩項、保留篩選與 Copy 與 Terminal 三項。驗證方式：對照本次交付的功能集與 proposal 的 Non-Goals 做內容審閱。
