## 1. 篩選

- [x] 1.1 **Filter changes by name** 的比對規則：新增純比對模組，判斷變更名稱是否以不分大小寫的方式包含篩選字，並由完整清單與篩選字算出符合清單；篩選字為空時全數通過；artifact 路徑與提案人皆不參與比對。驗證方式：`src/test/changeFilter.test.ts` 涵蓋不分大小寫、artifact 路徑不被比對、提案人不被比對，以及空篩選字回傳完整清單。
- [x] 1.2 **Display changes as a grouped tree** —— 對應設計決策「群組節點在篩選期間顯示符合數與總數」：篩選字為空時群組節點顯示變更數量，非空時同時顯示符合數與總數；無論是否符合，三個群組節點恆存在。驗證方式：`src/test/nodes.test.ts` 斷言 spec 中「兩個 Active、一個 Parked、零個 Archived」的無篩選案例，以及「三個 Active 中一個符合、Parked 一個符合、Archived 零個」的篩選案例。
- [x] 1.3 篩選在樹重建路徑上生效：三個群組同時套用，符合的變更其 artifact 全部保留，篩選套用在排序之後，且切換篩選只重建樹不觸發掃描。驗證方式：`src/test/nodes.test.ts` 斷言 spec 的三群組同時縮減案例、符合變更的兩個 artifact 仍在，以及無任何符合時三個群組節點皆在且其下無變更節點。
- [x] 1.4 實作 **篩選以指令搭配輸入框驅動，狀態顯示於檢視標題旁**：標題列的篩選指令開啟輸入框並套用結果，清空即取消篩選；目前篩選字與排序選項共用檢視標題旁的文字；Refresh 保留目前篩選字並套用到新快照。驗證方式：`src/test/manifest.test.ts` 斷言篩選指令存在且出現在 `spectraChanges` 的標題列選單；於 Extension Development Host 手動確認輸入篩選字後標題旁同時顯示排序與篩選、Refresh 後篩選仍在。

## 2. 複製變更名稱

- [x] 2.1 **Copy change names to the clipboard** 的選取轉換規則：新增純函式把節點陣列轉成剪貼簿文字，只取變更節點、群組與 artifact 節點忽略而非阻擋，多個名稱以單一換行分隔且順序即輸入順序，沒有任何變更節點時回傳空值代表不應寫入剪貼簿；輸出只含變更名稱，不含群組、提案人與進度數字。驗證方式：`src/test/copySelection.test.ts` 涵蓋 spec 的選取對照表六列。
- [x] 2.2 實作 **複製走自訂指令與鍵盤繫結，而非標準 Copy 動作**：manifest 貢獻複製指令、樹的右鍵選單項目，以及一個限定本檢視有焦點時才生效的鍵盤繫結；檢視開啟多選，指令自參數取得整個選取集合；成功複製不出任何通知，選取中沒有變更節點時剪貼簿維持原樣。驗證方式：`src/test/manifest.test.ts` 斷言指令存在、出現在 `view/item/context`、鍵盤繫結的 when 條件限定於本檢視焦點；於 Extension Development Host 手動確認多選兩個變更後複製得到兩行名稱。

## 3. 送出 Spectra 指令

- [x] 3.1 實作 **指令文字是單行，且永遠不附換行**：新增模組匯出四個支援的斜線指令名與組字函式，輸出為斜線指令名加一個空格加變更名稱，無結尾換行，且不含群組、提案人與進度數字。驗證方式：`src/test/spectraCommand.test.ts` 涵蓋 spec 的四列指令文字對照表，並斷言輸出不以換行結尾、四個指令名依 apply、ingest、archive、commit 排列。
- [x] 3.2 實作 **送出指令只在剛好選中一個變更節點時啟用**：自選取集合取出唯一的變更節點，群組與 artifact 節點忽略而非阻擋計數；沒有變更節點或超過一個時回傳空值代表不應提供指令。驗證方式：`src/test/copySelection.test.ts` 斷言 spec 的 submenu 可用性對照表六列。
- [x] 3.3 **Send a Spectra command for the selected change** 的送出路徑 —— 對應設計決策「沒有作用中的終端機時退回剪貼簿，不自動開新的」：有作用中終端機時把指令文字寫進其輸入位置且不附換行、不執行，並把焦點移過去、剪貼簿不變；沒有時寫進剪貼簿、焦點不動、不出通知；寫入終端機拋出例外時記入輸出頻道並改寫剪貼簿、不出對話框。驗證方式：於 Extension Development Host 手動確認有終端機與關閉全部終端機兩種狀態下的去向，並確認送出後指令停在輸入位置未被執行。
- [x] 3.4 實作 **以 QuickPick 呈現四個完整指令文字與當下去向**：右鍵選單提供一個開啟 QuickPick 的項目，QuickPick 列出四個已帶上變更名稱的完整指令文字，標題明示接下來是寫進終端機還是剪貼簿；選取集合不是剛好一個變更節點時不開啟。驗證方式：`src/test/manifest.test.ts` 斷言該指令存在且出現在 `spectraChanges` 的 `view/item/context`；於 Extension Development Host 手動確認 QuickPick 顯示完整指令文字，且開關終端機後標題隨之改變。

## 4. 文件

- [x] 4.1 README 補上篩選、複製名稱與送出 Spectra 指令三項說明，載明篩選為輸入後套用而非即時縮減、送出的指令不會被自動執行、沒有作用中終端機時改寫入剪貼簿；並清空「尚未提供」清單中的這三項，保留多根工作區只掃第一個資料夾的說明。驗證方式：對照本次交付的功能集與 proposal 的 Non-Goals 做內容審閱。
