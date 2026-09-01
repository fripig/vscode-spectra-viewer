## Context

`idea-spectra-viewer` 是已上架的 JetBrains 外掛，其行為由兩個 capability 界定：`change-discovery`（檔案系統掃描、解析 `tasks.md`、推導狀態）與 `changes-tool-window`（Swing 樹、排序、篩選、剪貼簿、終端機）。它的 18 條需求是針對 IntelliJ Platform 撰寫的。

本次把其中與平台無關的那一半完整移植過來，並把呈現層移植到「一棵能用的樹」為止。目前這個 codebase 完全沒有原始碼，所以建置、模組切分、測試、打包全都是新的。

移植不是機械式的。有三項 IntelliJ 設施在 VS Code 沒有直接對應物 —— 工具列內嵌文字框、參與 IDE 標準 Copy 動作的樹、以及單一 project root —— 每一項都逼出一個影響整體結構的決策。這三塊延後到後續 change，但本次選定的模組邊界必須替它們留好位置。

## Goals / Non-Goals

**Goals:**

- 一個能安裝、能用的擴充：activity bar 容器、Active／Parked／Archived 三組變更的樹、變更節點上的任務進度、開啟 artifact、刷新、welcome 狀態。
- 一個行為符合 `change-discovery`、且能用純 Node 做單元測試（不需要 VS Code test host）的 discovery 層。
- 一個能讓後續 change（中繼資料、排序、篩選、複製、終端機）直接疊上去、不必重構的模組邊界。

**Non-Goals:**

- 讀取 `.openspec.yaml` 的 `created` / `created_by`、顯示提案人、排序、篩選、複製名稱、送出終端機指令。全部延後到後續 change。
- 以 webview 實作樹。已否決：能換到常駐篩選輸入框，但代價是手寫樹狀渲染、主題與鍵盤操作。
- 用 file system watcher 自動刷新。已否決：parked changes 在工作區之外，VS Code watcher 難處理；且實作期間 `tasks.md` 持續改寫。
- 支援多根工作區。只掃第一個 workspace folder。
- 使用 `spectra` CLI 或 Spectra 內部資料庫。

## Decisions

### 使用原生 VS Code Tree View API 呈現樹狀結構

`TreeDataProvider` 搭配一個 `viewsContainers.activitybar` 項目，能與 IntelliJ 的節點階層（群組 → 變更 → artifact）一對一對應，而且主題、展開狀態記憶、多選、context menu、`viewsWelcome` 空狀態全部免費取得。

替代方案是 webview。它是唯一能做出常駐篩選文字框的路，因為 VS Code 的 tree view 根本沒有地方放輸入控制項。已否決：手寫樹狀渲染、主題 token 與鍵盤操作的成本，是它換來的那一條需求的數倍，而那條需求本次還被延後了。後續 change 會改用指令搭配 `showInputBox` 來驅動篩選。

### 在模組邊界切開 discovery 與 presentation

`src/discovery/` 不從 `vscode` import 任何東西。它匯出純資料（一個 snapshot 物件），只認識路徑、YAML 行、Markdown checkbox 與 git 間接層。`src/view/` 是唯一 import `vscode` 的地方，它消費 snapshot 而不重新詮釋。

這個邊界是有承重的，不是轉發用的薄殼：discovery 藏了 git worktree 解析、checkbox 計數、狀態推導與單一變更的錯誤隔離；view 藏了 tree item 建構與節點識別。刪掉任一邊都會移除真正的行為。

實際好處在測試。因為 discovery 從不碰 `vscode`，Vitest 能直接在 Node 裡對著暫存目錄跑它 —— 不需要 `@vscode/test-electron`、不必下載 Electron、不必有顯示器。參考專案的 `ChangeScannerTest`、`TaskProgressParserTest` 與狀態推導案例可以整批移植成一般單元測試。

### 只掃描第一個 workspace folder

`workspace.workspaceFolders[0]` 就是 project root。多根工作區的其餘資料夾一律忽略。

替代方案是掃描每個資料夾，那就得在三個群組之上多一層 workspace folder 節點，並把 snapshot 從單一物件變成鍵值集合。群組計數、排序、篩選、節點識別 —— 每一條下游需求的形狀都要改。已否決為過度設計：常見情況就是一個 Spectra 專案一個資料夾。

完全沒有 workspace folder 時，擴充的行為與「資料夾沒有 `openspec` 目錄」完全相同。

### 定位 parked changes 前先解析 git 目錄

Parked changes 位於「解析後」的 git 目錄裡的 `spectra-app/changes/`，而那不一定是 `<root>/.git`。當 `.git` 是檔案時，裡面是一個 `gitdir:` 指標；當它指向的目錄裡有 `commondir` 檔時，該檔記錄的路徑以其為基準解析後勝出。這正是讓擴充能在 git worktree 裡運作的關鍵 —— 而 Spectra 自己的 worktree 支援會把使用者放進去的就是那裡。

失敗被隔離：git 目錄無法解析時 Parked 群組為空，Active 與 Archived 照常填入，掃描永不失敗。

### 推導變更狀態並以節點圖示呈現

狀態由任務進度推導：沒有進度資訊為 Draft，N 之中完成 0 為 Not Started，N 之中完成 N 為 Complete，其餘為 In Progress。

參考外掛會推導狀態卻從不顯示。這裡讓它決定變更節點的 `ThemeIcon`，使這段推導在本次 change 就有消費者、不留下等後續才用的死碼，同時給樹一個 VS Code 使用者預期會有的圖示欄。進度數字仍放在節點 description，與參考實作一致。

### 透過擴充自訂指令開啟 artifact，而非直接使用 vscode.open

把 artifact 節點的 `command` 直接綁到 vscode.open，會在檔案自上次掃描後被刪除時彈出 modal 錯誤。改成由節點呼叫一個擴充自訂指令：先 stat 檔案，成功才開啟，失敗則顯示非阻斷式警告通知。

單擊，不是雙擊。參考外掛用雙擊是因為那是 IntelliJ 樹的慣例；單擊開啟才是 VS Code 慣例，也與內建檔案總管一致。

### 給每個節點穩定識別碼，讓 refresh 保留展開狀態

參考外掛在重建後明確地重新展開節點。VS Code 會自己做，但前提是 tree item 在多次重建之間帶著穩定的 `id`。節點 id 由群組、變更名稱與 artifact 相對路徑推導，因此同一個邏輯節點在兩次掃描間 id 不變，檢視不需要任何記帳程式碼就能還原展開狀態。

### 全面使用非同步檔案系統 API，並將個別變更的失敗寫入 output channel

參考需求是「不要在 event dispatch thread 上掃描」。Node 的對應做法是：只用 `node:fs/promises`，絕不用 `*Sync` 變體，讓 extension host 永不被阻塞。

參考需求中「寫入 IDE log」則對應到一個由擴充自己擁有的 `OutputChannel`。讀不到的變更目錄會從 snapshot 中略去並記錄在那裡；不出現任何對話框，掃描其餘部分照常完成。

## Implementation Contract

**行為**

裝好擴充並開啟一個 Spectra 專案後，activity bar 會出現 **Spectra** 圖示。點開它會看到 **Changes** 樹，最上層剛好三個節點 —— Active、Parked、Archived —— 各自標示所含變更數量，數量為零時節點仍在。展開群組會列出變更節點；展開變更會列出其 Markdown artifact，以相對於變更目錄的路徑呈現。變更節點顯示已完成／總計任務數，以及一個反映其狀態的圖示。點擊 artifact 會在編輯器分頁開啟。檢視標題列的 Refresh 按鈕會重新掃描。沒有 `openspec` 目錄的資料夾會顯示 welcome 訊息而非樹。

**介面與資料形狀**

discovery 層匯出單一進入點，接受一個 project root 路徑，解析出一個 snapshot：三個陣列，每組一個。每個變更帶有：名稱（目錄名）、群組、目錄絕對路徑、artifact 清單（其下所有 `.md` 檔，以相對路徑表示，按字串排序）、任務進度（已完成與總計，或不存在），以及推導出的狀態。群組內的順序未定義 —— 由 view 決定。

三個來源目錄，相對於 project root：Active 為 `openspec/changes/`（排除 `archive` 項目）、Archived 為 `openspec/changes/archive/`、Parked 為解析後 git 目錄下的 `spectra-app/changes/`。

貢獻的識別碼：activity bar 中的 view container `spectra`、其中的 view `spectraChanges`、刷新樹與開啟 artifact 兩個指令，以及一個依「工作區是否有 `openspec` 目錄」控制 welcome view 顯示與否的 context key。

**失敗模式**

- 讀不到的變更目錄：從 snapshot 略去，output channel 記一行，不出對話框，掃描完成。
- `.git` 缺失或讀不到，或 `gitdir:` 指向不存在的路徑：Parked 為空，Active 與 Archived 不受影響。
- 變更沒有 `tasks.md`，或 `tasks.md` 沒有任何被計數的 checkbox：無進度資訊，狀態 Draft，節點不顯示數字。
- artifact 檔案在上次掃描後被刪除：非阻斷式警告通知，檢視維持可用。
- 沒有 workspace folder，或資料夾沒有 `openspec` 目錄：顯示 welcome view，不報錯。

**驗收標準**

- 測試腳本以 Vitest 對 `src/discovery/` 執行，不需要 VS Code test host，涵蓋：三來源掃描（含 `archive` 排除）、每一種 git 目錄解析情況、checkbox 計數表（含圍籬程式碼區塊與平行任務標記）、狀態推導表。
- 編譯腳本以 esbuild 產出 bundle，型別檢查腳本回報零錯誤。
- 打包指令能產出 `.vsix`。
- 在 Extension Development Host 中對著本 repository 手動驗證：三個群組出現且計數正確；用 CLI park 掉的變更在 Refresh 後出現在 Parked 而不在 Active；展開一個群組與一個變更後按 Refresh，兩者仍展開；點擊 `proposal.md` 會開啟；刪除某個 artifact 檔後點擊其過期節點，出現警告通知而非錯誤對話框。

**範圍邊界**

**在範圍內**：建置設定、完整的 discovery 層、樹狀檢視、節點圖示、開啟 artifact、刷新、welcome 狀態、output channel 記錄，以及一份 README。

**在範圍外**：Non-Goals 列出的全部項目。特別是本次完全不解析 `.openspec.yaml` —— snapshot 不帶建立日期也不帶提案人，這兩者由後續 change 以單次讀取該檔一併加入。

## Risks / Trade-offs

- **activity bar 容器佔掉一個位置並需要一個 SVG 資產，對單一棵樹來說偏重** → 專屬容器的可發現性遠高於埋在檔案總管裡的檢視，也符合參考外掛的呈現方式。若日後覺得干擾，把檢視移進 Explorer 容器只需改 `contributes` 區塊，不動任何程式碼。
- **節點 id 必須唯一，否則 VS Code 會在展開行為上悄悄出錯** → id 由群組加變更名稱加 artifact 相對路徑組成，三者在各自的父層下依建構方式即為唯一。掃描已把 `archive` 目錄排除在 Active 之外，因此不會有名稱跨群組碰撞成同一個 id 的情況。
- **每次刷新都要走遍每個變更目錄底下的所有檔案來收集 Markdown artifact** → 變更目錄只有少數小檔，而刷新是手動而非持續進行，成本有界。延後 file system watcher 正好讓它維持如此。
- **延後排序，意味著 discovery 契約沒有定義群組內的初始順序** → 本次由 view 以名稱升冪作為固定且明文記載的順序。後續 change 會用使用者可選的排序取代它，且不必動到 discovery。
- **Cursor 等分支讀的是 Open VSX 而非 VS Code Marketplace** → 發布不在本次範圍內，但 manifest 會寫成日後直接執行 Open VSX 發布指令即可、無須再改的樣子。
