## 1. 擴充骨架

- [x] 1.1 建置工具鏈在空原始碼樹上完整可跑：esbuild 能為擴充進入點產出 bundle、型別檢查回報零錯誤、Vitest 能發現 `src/test/` 底下的單元測試。驗證方式：依序執行 compile、type-check、test 三個 npm script，確認三者皆成功結束。
- [x] 1.2 **Provide a Spectra view**：manifest 在 activity bar 貢獻一個帶 SVG 圖示的 Spectra view container，內含單一 Changes view，並把啟動延後到該 view 首次被開啟時。驗證方式：在 Extension Development Host 中確認 activity bar 出現 Spectra 圖示，且在選取該 view 之前擴充顯示為未啟動。

## 2. Discovery 層

- [x] 2.1 **在模組邊界切開 discovery 與 presentation**，定義 snapshot 與變更的資料形狀，並實作 **Derive change status from task progress**：無進度資訊得到 Draft、N 之中完成 0 得到 Not Started、N 之中完成 N 得到 Complete、其餘得到 In Progress。驗證方式：`src/test/model.test.ts` 涵蓋狀態推導表的四列。
- [x] 2.2 **Derive task progress from tasks.md**：解析器計數 Markdown checkbox 行，把單一空白視為未完成、`x` 或 `X` 視為完成，忽略其他標記，忽略圍籬程式碼區塊內的行，容忍前置空白與平行任務標記，並在檔案缺失或沒有任何被計數的 checkbox 時回報無進度資訊。驗證方式：`src/test/taskProgress.test.ts` 涵蓋 checkbox 解析表的每一列，外加兩種無進度情況。
- [x] 2.3 **Resolve the git directory including worktree indirection** —— 對應設計決策「定位 parked changes 前先解析 git 目錄」：`.git` 是目錄時直接回傳該目錄，是檔案時跟隨 gitdir 指標，指向的目錄含 commondir 檔時改以其記錄的路徑為準，指標目標不存在時解析為無。驗證方式：`src/test/gitDir.test.ts` 以暫存目錄 fixture 涵蓋這四種情況。
- [x] 2.4 **Scan changes from all three Spectra sources** 與 **Report per-change metadata**：對 project root 掃描一次即回傳 Active、Parked、Archived 三組，Active 排除 archive 目錄，忽略非目錄項目，並回報每個變更的名稱、群組、目錄絕對路徑、以相對路徑表示且已排序的 Markdown artifact 清單、任務進度與推導狀態。驗證方式：`src/test/scanner.test.ts` 涵蓋混合佈局範例、archive 排除、來源目錄缺失、變更目錄旁的零散檔案，以及 artifact 列舉與排序案例。
- [x] 2.5 **Degrade gracefully on unreadable changes** 與 **Perform file system access asynchronously** —— 對應設計決策「全面使用非同步檔案系統 API，並將個別變更的失敗寫入 output channel」：讀不到的變更目錄會從 snapshot 中移除並透過注入的 logger 回報，掃描其餘部分照常完成；讀不到的 tasks 檔則讓變更保留在樹上並標為 Draft；discovery 層任何地方都不出現同步檔案系統呼叫，也不出現 VS Code import。驗證方式：`src/test/scanner.test.ts` 斷言存活的變更與被捕捉到的警告，外加一個原始碼層級斷言，確認 discovery 目錄既未 import vscode 模組也未使用任何 fs 同步函式。

## 3. 樹狀檢視

- [ ] 3.1 **Display changes as a grouped tree** 與 **Order changes by name within groups** —— 對應設計決策「使用原生 VS Code Tree View API 呈現樹狀結構」：tree data provider 依序產出剛好三個群組節點 Active、Parked、Archived，各自顯示變更數量且數量為零時仍存在，其下的變更節點以不分大小寫的名稱升冪排序，再其下是以相對路徑為標籤的 artifact 節點。discovery 層發出的警告會顯示在 Spectra output channel。驗證方式：在 Extension Development Host 中開啟本 repository 手動確認三組渲染且計數正確、變更依字母序排列。
- [ ] 3.2 **Show task progress on change nodes** 與 **Show change status as the node icon** —— 對應設計決策「推導變更狀態並以節點圖示呈現」：有進度資訊時變更節點的 description 帶出已完成與總計數字、沒有時保持空白；節點圖示在四種狀態之間彼此不同，而群組節點與 artifact 節點都不使用這四個圖示中的任何一個。驗證方式：對涵蓋四種狀態的 fixture 變更，以及一個沒有 tasks 檔的變更，手動確認。
- [ ] 3.3 **給每個節點穩定識別碼，讓 refresh 保留展開狀態**：每個 tree item 帶有由群組、變更名稱與 artifact 相對路徑推導出的 id，在樹中唯一且在多次掃描之間不變。驗證方式：手動展開 Parked 群組與其中一個變更，觸發 Refresh，確認兩者仍展開，且程式中沒有任何明確的重新展開程式碼。
- [ ] 3.4 **Open artifact files in the editor** —— 對應設計決策「透過擴充自訂指令開啟 artifact，而非直接使用 vscode.open」：點擊 artifact 節點會呼叫一個擴充自訂指令，先確認檔案存在再於編輯器分頁開啟；檔案自上次掃描後已被刪除時，改為顯示非阻斷式警告通知。點擊群組節點或變更節點只會展開或收合。驗證方式：手動點擊 `proposal.md` 確認開啟；在磁碟上刪掉某個 artifact 後點擊其過期節點，確認出現警告通知、沒有 modal 對話框、檢視仍可用。
- [ ] 3.5 **Refresh on demand**：檢視標題列的 Refresh 指令會執行新掃描並重建樹，首次開啟檢視時執行初始掃描，目錄已消失的變更事後就只是不存在於樹上。驗證方式：手動對一個 active 變更執行 spectra park，觸發 Refresh 確認它從 Active 移到 Parked；接著刪掉一個變更目錄再 Refresh 一次，確認沒有拋出錯誤。
- [ ] 3.6 **Indicate loading and uninitialised states** 與 **Scan only the first workspace folder** —— 對應設計決策「只掃描第一個 workspace folder」：掃描期間檢視上出現進度指示；第一個 workspace folder 沒有 `openspec` 目錄或根本沒開資料夾時，以 welcome 訊息取代樹；該目錄被建立並觸發 Refresh 後樹回來；其餘 workspace folder 既不被掃描也不顯示。驗證方式：分別對「沒有 openspec 的資料夾」「沒開資料夾的空視窗」「兩個資料夾都有變更的雙根工作區」手動確認。

## 4. 文件

- [x] 4.1 README 說明擴充做什麼、如何安裝、讀取哪三個目錄、不需要任何 Spectra 行程在跑且從不讀取 Spectra 內部資料庫，以及它是非官方的社群專案。同時記錄已延後的功能，讓讀者不會期待排序、篩選、複製或終端機指令。驗證方式：對照已交付的功能集與 proposal 中記錄的 Non-Goals 做內容審閱。
