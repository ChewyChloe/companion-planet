# 2026-11-23 美術重製補充

本文件下方保留首版開發紀錄；當中「程序化基本模型／無 GLB／舊 FPS 與 DPR」是歷史狀態。現版改為原創 Blender 連續皮膚、GLB 骨架動畫、自訂岩體與分材質家具，DPR 上限 1.5。新版本實際測試、截圖、效能與人工驗收限制，以 [VISUAL_QA.md](VISUAL_QA.md) 與 artifacts/art/visual-results.json 為準。

# 同頻星球開發與驗收報告

日期：2026-11-23（台灣時間）。本次由空白儲存庫建立可執行的網頁與 Electron 原型。所有原始碼與產物在目前工作區，未推送 GitHub。環境設定草稿已保存 `install_script`、`start_skill`；尚未發布或在全新任務驗證還原。

## 已實作

- React／Three.js 真實即時 3D 星球：桌椅、書本、杯子、植物、休息墊、石頭與小燈；可拖曳旋轉、縮放。
- 星雲仔是原創程序化模型：淡藍圓潤身體、兩根觸角、眼睛／眨眼、臉頰與手腳。無可用 GLB，因此未使用 Tripo 影片或靜態圖冒充模型。
- 共用行為系統：自主待機／散步／休息／伸展；使用者互動可開心跳動、傾聽、靠近、返回原活動目標。專注優先去書桌閱讀。位置有界、以時間差插值、動作具冷卻，旋轉採最短角度過渡。
- 番茄鐘：開始、暫停、繼續、重設、專注完成、手動啟動休息、1 分鐘／10 秒展示。採截止時間，不累加 interval 次數；重新整理或背景停留會結算截止時間。保存剩餘時間、時長選擇與偏好，不自動連續開始下一段。
- 安靜模式保留動畫，抑制所有主動訊息；專注不主動聊天，完成最多一次提示，可關閉。
- 繁體中文對話：無憑證時採本機規則 Mock；可換 OpenAI-compatible 供應商。結構驗證、8 秒後端／10 秒前端逾時、錯誤備援、600 字元限制、每分鐘限流。API Key 僅在後端。
- AI 的開始專注、休息、安靜建議須 UI 確認；角色動作受專注規則約束，無系統／檔案／其他應用程式操作權限。
- Electron 無框透明配置、桌寵置頂、可拖曳把手、模式互切、隱藏／恢復／退出。只使用一個 renderer，模式切換不丟失計時；固定 loopback 3002 使重開程式維持 localStorage 來源。
- 音效開關（本機合成低音量和弦）、減少動畫、系統減少動態偏好、清除本機資料。攝影機／麥克風不啟用。

## 架構與版本

`src/domain.ts` 為純計時規則，`src/behavior.ts` 管理優先權／冷卻／目標，`src/Scene.tsx` 負責 3D、動畫與鏡頭；`src/store.ts` 保存共用狀態。`shared/dialogue.js` 可在瀏覽器安全使用，`server/` 才包含 LLM 網路傳輸。`electron/` 限制 preload 介面、禁止新視窗／外部導覽與裝置權限。

實測版本：Node 24.22.3、npm 11.19.1、React/ReactDOM 19.3.1、Three.js 0.181.2、R3F 9.8.2、Drei 10.7.9、Zustand 5.1.0、Express 5.3.0、Vite 7.3.8、TypeScript 5.9.3、Vitest 4.1.12、Playwright 1.65.1、Electron 39.8.10、electron-builder 26.18.0。實際依賴由 package-lock.json 固定，另見 artifacts/dependency-versions.json。

## 測試與證據

| 驗證 | 結果 | 內容 |
| --- | --- | --- |
| 鎖檔重新安裝 | 通過 | 實際執行 scripts/cloud-install.sh，npm ci 後重新檢查 |
| TypeScript／ESLint | 通過 | npm run check，涵蓋前端、測試與後端 Lint |
| Vitest | 19 通過，0 跳過 | 計時暫停／截止／重開、安靜提示規則、行為優先權／冷卻／返回、格式拒絕、供應商成功／錯誤備援、緊急求助、API Origin／輸入、保存／清除 |
| Production build | 通過 | Vite 成功；主要 JS 約 1.24 MB（gzip 約 353 KB），存在大型 chunk 提示 |
| 依賴相容性 | 通過 | npm ls --depth=0 無 peer／invalid 錯誤 |
| Web E2E | 見 artifacts/web-results.json | 1366×768、390×844 各 3 項，旋轉、實際點擊角色、動畫姿態變化、閱讀、暫停／重新整理／繼續、專注完成、聊天、AI 確認、安靜及離線備援 |
| Electron 整合 | 見 artifacts/electron-results.json | Xvfb 上啟動 production build、切換桌寵、置頂、透明配置、無 Node renderer、持續動畫、保留計時、最小化／恢復、返回與退出 |
| 整合 smoke／視覺 | 通過 | fresh install 後再次啟動服務，實際 health／chat 請求，執行 scripts/inspect.mjs，檢視桌機、手機、閱讀、聊天與桌寵截圖 |
| Windows x64 ZIP | 建置及完整性檢查 | CRC、ASAR 必要檔案與依賴、無 .env；Windows 實際執行尚未驗證 |
| NSIS 安裝檔 | 未完成 | Linux 缺少 Wine，建置失敗；已移除不完整 exe，保留 Windows 建置配置 |
| 真實付費 LLM | 未驗證 | 未設定 LLM_API_KEY；本機及失敗備援可用，供應商協定透過模擬傳輸測試 |

機器可讀結果與截圖均在 `artifacts/`。`web-results.json`、`electron-results.json` 是實際 runner 輸出，不以零測試或 skipped 充當成功。測試中的日期前移僅用於穩定驗證截止，真實 10 秒計時亦在安靜模式流程執行。桌寵 PNG 含 alpha 0–255，表示 renderer 輸出包含透明區域；這不等同 Windows 原生視窗合成驗證。

效能採 headless SwiftShader 軟體渲染，1366×768／DPR 1、3 秒採樣約 12 FPS，詳見 artifacts/performance.json。測量環境沒有可代表一般桌機的 GPU，因此不宣稱達到 60 FPS；Windows GPU FPS、長時間耗電與不同顯卡仍待測。動畫使用 refs、避免逐幀 React 更新；計時畫面只在整秒變動更新，活動標籤在動作改變時更新，DPR 上限 1.7、光影解析度受限，沒有昂貴透射／體積材質。

## 實際執行與修正

主要指令：npm install、npm run check、npm run test:e2e、npm run test:electron、bash scripts/cloud-install.sh、node scripts/inspect.mjs、npm run package:win（因 Wine 失敗）、npm run package:win:portable。桌面測試在 DISPLAY=:99 執行，Xvfb 以 Debian 已簽署套件索引驗證後下載並解壓至 /workspace/.companion-tools，不修改系統權限或停用校驗。

已修正：

1. 預設快取不可寫：改用 /tmp 內的 npm／Electron 快取。
2. Electron 下載未走代理：啟用下載器支援的代理並沿用既有 CA，保留 checksum/TLS 驗證。
3. 星球被裁切、手機與標題重疊：調整鏡頭、視域與手機場景留白，重新截圖檢查。
4. 網站圖示 404：加入原創圖示。
5. 測試報告 HTML 寫入觸發 Vite 重載：忽略報告／產物目錄；Web 與 Electron 採獨立 runner 輸出，不並行啟動同一 Web suite。
6. 全時鐘模擬干擾重新整理後的點擊等待：僅控制 Date，保留真實動畫／事件排程。
7. 暫停／偏好保存被 ticking 節流延後：關鍵變更立即保存，增加測試。
8. 重新開啟專注時長選單回預設：一併保存選定時長；處理 localStorage 被寫成 null 等無效值。
9. 桌面隨機 API 埠造成重開儲存來源改變：改用固定 loopback 埠與單一實例。
10. 靠近後缺少返回活動目標：抽離純行為 planner，加入返回、冷卻與優先權測試。

## 邊界、未驗證與後續

- Windows 原生透明、拖曳、系統匣、DPI、多螢幕及安裝／解除安裝均未實機驗證。Linux 測試只證明可執行的共用 Electron 路徑與設定。請依 README 的 Windows 清單操作。
- ZIP 未簽章，exe 未進行 Windows 資源編輯，仍使用預設 Electron 圖示；NSIS 需在有 Wine 的建置機或 Windows 執行 npm run package:win。關閉視窗即退出；保留桌寵請用隱藏。
- 未啟用滑鼠穿透，小視窗透明部分仍可能攔截點擊，可拖走／隱藏，不存在永久失去操作的穿透模式。
- 正式 GLB／骨架 clips 未提供也未驗證。替換槽沿用 transform 動畫，不保證任意骨架直接相容。
- 緊急求助為關鍵字備援，不能辨識所有表述；本產品不提供心理診斷／治療。真實 LLM 的中文品質、費用及延遲仍待授權測試。
- 未做九角色、社群、自由裝潢、跨應用程式 Agent、聲音／鏡頭監控；未做使用者研究，不宣稱提升專注力／心理健康已獲證實。
- 大型 JS chunk、軟體渲染 FPS 與長時使用尚有改善空間，並未把效能限制隱藏成硬體驗收通過。

## 安裝與操作

原始碼：npm ci → npm run dev；桌面：npm run desktop。Windows ZIP 解壓後執行「同頻星球.exe」。細節、LLM 環境設定與逐項實機驗收見 README.md。開發規則與接續方式見 AGENTS.md。雲端環境請在設定頁檢閱、儲存並發布草稿；發布不代表 Windows 或新任務還原已測試。


## 手機擴充最新結果

手機版擴充後，靜態檢查與 21 項 Vitest、6 項既有 Web、3 項手機觸控、1 項 Electron 測試通過。正式網頁入口、區網／HTTPS 來源驗證、觸控／鍵盤版面與 Render 設定已完成；尚未部署公開網站或實機驗證。詳見 [手機驗收報告](artifacts/MOBILE_REPORT.md) 與 [手機連線說明](MOBILE.md)。原先 Windows ZIP 未因本次手機擴充重打包。

## 響應式視覺重設計

依使用者回饋，桌機／平板／手機已共用淺色紙感與 Huninn 排版，更新 SVG 圖示及霧面 3D 庭園。37 項單元／功能／字型設計測試通過，七組尺寸完成截圖檢視。完整內容見 [REDESIGN.md](REDESIGN.md)。本報告較早段落記錄的是各開發階段當時的狀態；使用者目前已在 Render 試用初版，新版部署需另行確認。
