# 同頻星球 · Companion Planet

「你專心的時候，牠也在做自己的事。」

真正即時渲染的 3D 湖畔小島、星雲仔、番茄鐘、繁體中文對話，以及 Electron 桌寵。無 API Key 時可使用本機規則回覆；**Mock 不是生成式 AI**，但使用相同的角色控制器與計時系統。

## 開始使用

建議 Node.js 24 LTS、npm 11。Windows 10/11 x64 為桌面目標。

```sh
npm ci
npm run dev
```

Vite 開發服務使用 5173，後端使用 3001。由終端顯示的網址開啟全螢幕湖畔場景。拖曳場景旋轉、滾輪或雙指縮放，按住角色可抓起並拖放到小島空地；直接點一下會隨機做動作或出現短句。右下星球圖示可切換九位居民，選擇會記住。左上播放／暫停專注，點時間數字開啟時長與重設；右上控制設定、環境音，右下開啟聊天或迷你陪伴。桌機、平板與手機使用同一響應式版面。計時以截止時間計算，暫停／重新整理不會重新起算。版面驗證見 [LAYOUT_QA.md](LAYOUT_QA.md)，九位居民與拖放操作見 [INTERACTION_QA.md](INTERACTION_QA.md)。

「安靜陪我」停止主動提示，仍可主動聊天。專注期間不主動發話，結束最多提醒一次。右上角設定可減少動畫、關閉提示、清除本機資料。環境音為本機合成的低音量和弦，需手動開啟，不使用外部音訊素材。

## 桌寵

```sh
npm run desktop
```

此指令先建置，再啟動 Electron；不需另開 API。桌面內嵌服務使用固定的 loopback 3002，讓重開程式後仍使用同一個本機儲存來源；連接埠被占用時啟動將失敗，不會接管其他服務。

- 星球頁右下角「切換桌寵模式」。透明、無框、320×420、置頂。
- 抓住桌寵角色本體，或拖曳桌寵上方名稱區域移動。星球頁可拖曳頁首空白區域。
- ↗ 返回星球；☏ 開啟對話；− 隱藏至系統匣，有系統匣時從選單重新開啟，否則最小化至工作列；× 完全退出。
- 系統匣選單提供星球、桌寵及退出。關閉視窗或退出會結束 API，不留桌寵背景程序。
- 未啟用滑鼠穿透，因此角色始終可操作；小型視窗的透明區域仍可能攔截滑鼠。可拖走或最小化，避免擋住其他應用程式。
- 瀏覽器「體驗迷你陪伴」只切換網頁版面；真正的系統置頂／透明視窗需要 Electron。

Linux 虛擬顯示器測試已驗證 Electron 主要操作；Windows 原生合成、拖曳、系統匣及安裝須依下方實機驗收，未宣稱通過。

## 可選 LLM

複製 `.env.example` 為 `.env`，將 `LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL` 設於後端環境。採用 OpenAI-compatible chat completions JSON 格式。開發 API 與未打包 Electron 都會讀取專案 `.env`。已打包版本請透過作業系統環境變數提供，不將 `.env` 放進套件。

API Key 不進入前端／儲存庫；避免使用 `VITE_` 前綴。設定完成後重啟程式。雲端須允許該供應商網域；本次未設定或測試付費 API。網路代理使用繼承的 HTTP(S)_PROXY 與 CA；不關閉 TLS 驗證。

文字最多 600 字元，API 每來源每分鐘最多 20 次，模型請求 8 秒逾時。格式無效、供應商出錯或前端 10 秒未取得回應時會採備援；介面會標示回覆模式。AI 建議開始專注／休息／安靜時必須另按確認。模型無法呼叫作業系統或讀取個人檔案。開發／桌面 API 預設僅在 loopback 監聽；`npm start` 的正式網站監聽網路介面，並以本機介面及明確的 `WEB_ORIGINS` 校驗 Host／Origin，不開放萬用 CORS。

對話僅存本次視窗記憶體；最近 6 則訊息會隨請求送往設定的供應商。計時與偏好存在 localStorage，可清除。緊急自傷詞句採明確求助回覆，不送模型；目前是保守的關鍵字備援，並非完整危機辨識或醫療服務。

## 指令與驗證

```sh
npm run check          # TypeScript、ESLint、Vitest、production build、依賴相容性
npm run test:e2e       # Chromium：1366×768 與 390×844
npm run test:electron  # 先 npm run build；需要桌面顯示器
npm run package:win    # Windows 上製作 NSIS 安裝檔；Linux 需要 Wine
npm run package:win:portable # Windows x64 可攜 ZIP
```

E2E 預設使用 `/usr/bin/chromium`；其他系統請設定 `CHROMIUM_PATH` 為 Chromium／Chrome 執行檔路徑。例如 PowerShell：`$env:CHROMIUM_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'`。Electron 測試以自己的 BrowserWindow 執行，不依賴 Chrome 路徑。測試中的 `--no-sandbox` 僅用於受限制的 Linux 測試容器，正常桌面啟動維持沙箱。

本機測試報告位於 `playwright-report/`、`playwright-report-electron/`；交付摘要、截圖和測量在 `artifacts/`，詳見 `DEVELOPMENT_REPORT.md`。`?stats` 在開發模式顯示 FPS 工具。

## 素材與架構

星雲仔已重製為原創 Blender 連續皮膚骨架模型 `public/models/nebula-sculpt.glb`，可編輯來源、真實外觀參數與重建指令見 [assets/art/README.md](assets/art/README.md)。場景包含自訂月岩地形、坑洞、苔蘚、木桌／靠背椅／曲面書頁／彎頸桌燈與休息區。模型替換需提供相同命名骨架與控制節點，不能直接換任意 GLB。美術診斷見 [ART_AUDIT.md](ART_AUDIT.md)，四視角、參考對照與驗收狀態見 [VISUAL_QA.md](VISUAL_QA.md)。

- `src/domain.ts`：純計時與行為規則。
- `src/behavior.ts`：動作優先權、冷卻、活動目標與返回路徑。
- `src/store.ts`：共用狀態與本機保存。
- `src/Scene.tsx`：星球、角色呈現、動畫和鏡頭。
- `src/main.tsx`：計時、聊天與設定介面。
- `shared/dialogue.js`：格式驗證、本機回覆。
- `server/`：LLM provider、限流、loopback API。
- `electron/`：安全 preload、模式與視窗生命週期。

## Windows 實機驗收（尚待執行）

1. 解壓可攜 ZIP 至可寫入目錄，執行「同頻星球.exe」；或在原始碼執行 `npm ci`、`npm run desktop`。
2. 確認星球完整可見、旋轉／縮放、角色散步與眨眼。啟動計時，確認走到書桌閱讀。
3. 切換桌寵，確認桌面透出、無邊框、置頂；拖曳上方把手，確認不影響其他應用程式。
4. 開啟聊天並送出「好累」；確認回覆與角色反應，計時未被更動。
5. − 隱藏後從工作列或系統匣恢復，↗ 返回星球。重開應用程式確認計時／偏好保存。
6. 10 秒展示結束只提醒一次；開啟安靜模式再試，無主動提醒。
7. × 或 Alt+F4 退出後，確認工作管理員沒有殘留本程式程序，3002 連接埠可釋放。
8. 若製作安裝檔，在 Windows 執行 `npm run package:win`，安裝／啟動／解除安裝。版本尚未程式碼簽章，需依實際 Windows 安全政策檢查。

## 手機版與公開網址

手機使用 Safari／Chrome 開啟網頁版，支援觸控旋轉、計時、聊天、安靜與音效；Windows ZIP 不適用手機。推薦部署公開 HTTPS 網站，設定已提供於 `render.yaml`。也可 `npm run build && npm start` 後，在同 Wi-Fi 手機開啟電腦網路地址。詳細連線、部署與實機限制見 [MOBILE.md](MOBILE.md)。使用者已透過 Render 試用初版；實際網址與部署狀態請以你的 Render 服務頁面為準。

## 響應式美術與字型

桌機、平板與手機共用淺色手帖風格、方正卡片及 SVG 圖示；3D 角色與場景採霧面材質、紙葉植栽、步道與小水池。Huninn 來自 Google Fonts，並提供本機 WOFF2 與 `Noto Sans TC, sans-serif` 後備；外部字型載入採非阻塞方式，字型下載失敗仍顯示文字。授權與來源記錄在 `public/fonts/`。`npx playwright test --config=playwright.design.config.ts` 驗證桌機／平板／手機與字型失敗情境，截圖位於 `artifacts/redesign/`。
