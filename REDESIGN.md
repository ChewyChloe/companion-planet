# 響應式視覺重設計

日期：2026-11-23。此輪依使用者要求，同時更新桌機、平板與手機，不是僅替手機換色。使用者已在 Render 試用初版；新版線上結果須待該服務部署後確認。

## 視覺

- 淺米紙色背景、橄欖色文字、方正卡片、細框與少量無模糊硬邊陰影。
- 移除 emoji 控制項、漸層、玻璃模糊、深色底及強烈發光效果；改用原創線條 SVG 圖示。
- Huninn 為所有文字／標題的第一字型，後備為 Noto Sans TC、sans-serif。Google Fonts link 非阻塞載入，並附經來源確認的本機 Huninn WOFF2，採 font-display: swap。外部網路失效不影響粉圓體；全部字型下載失敗仍顯示系統字型。
- 字型來自 Google Fonts 的 Huninn-Regular.ttf，僅轉換為 WOFF2，未修改字形。原始授權與來源 SHA-256 在 public/fonts。
- 桌機為敘事、3D 主視覺、專注手帖三區；平板採兩欄重排；手機採自然捲動的單欄。保留觸控、鍵盤可見區與安全區處理。

## 3D

星雲仔改為平滑曲面與較完整的霧面輪廓、實心材質、腹部色塊、細小五官與觸角；避免原先透明材質造成背面五官穿透。閱讀時可見手持書本。小星球重塑為微型庭園，加入紙葉植栽、花圃、踏石、淺水池、布墊、桌上書本與小木牌。取消即時投影、強烈光源和星光粒子，維持真正可旋轉、可互動的即時 3D。原有行為 planner、計時與 AI 權限規則未改。

## 驗證

- TypeScript、ESLint、production build、依賴相容性檢查通過；21 項單元／API 測試通過。
- 既有網頁 E2E 6 項、手機觸控 3 項、Electron 1 項通過。
- 新增響應式／字型失敗測試 6 項通過：桌機／平板／手機檢查無橫向溢出、方正元件、無漸層／玻璃／emoji；阻斷 Google 字型後仍載入本機 Huninn，阻斷全部字型後仍有可見文字與可用控制項。
- 實際檢視 1440×900、1280×800、1024×768、820×1180、390×844、360×640、844×390 七組主畫面與聊天截圖。修正平板標題斷行、手機副標與場景標籤碰撞、窄版開始按鈕換行。
- 管理式瀏覽器無法連線 Google Fonts 時，只把該外部資源錯誤與應用程式錯誤區別記錄；獨立故障測試明確驗證備援，未忽略 WebGL／本機字型／應用程式錯誤。

圖像與 runner 原始結果位於 artifacts/redesign、artifacts/web-results.json、artifacts/mobile-results.json、artifacts/electron-results.json。`node scripts/review-design.mjs` 可重做尺寸檢查；新增測試指令：`npx playwright test --config=playwright.design.config.ts`。

現有 Windows ZIP 為初版產物，未因這次網頁設計調整重新封裝；目前原始碼的 Electron 共用新版介面，已在 Linux 虛擬顯示器驗證。Windows 原生視窗、iOS／Android 實機與 Render 新版線上狀態未在此輪直接驗證。

最後另修正桌寵相機取景，讓放大角色的觸角與跳動留在畫面內。Electron 退出測試曾遇到視窗關閉瞬間的 Playwright 競態，現改為同時等候 close 事件與點擊完成，並嚴格驗證程序退出碼為 0；最終重跑通過。
