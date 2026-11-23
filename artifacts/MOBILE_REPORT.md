# 手機網頁擴充驗收

日期：2026-11-23。手機以 Safari／Chrome 開啟網頁；推薦公開 HTTPS 網址。尚未建立或發布公開網站，沒有託管授權，未建立付費資源。部署設定：render.yaml；發布與區網操作：MOBILE.md。

## 修改

- 新增 npm start 正式網站入口（server/web.js），前端與 API 共用來源，支援平台 PORT 或預設 8080。
- server/access.js 只允許目前本機介面與明確 WEB_ORIGINS；支援公開 HTTPS 反向代理來源，拒絕未知 Host／Origin。Electron 保持原來 loopback 預設，不擴大桌面 API 暴露範圍。
- 修正 Vite 區網聊天代理的 Host，驗證同 Wi-Fi 來源；不使用萬用 CORS。
- 手機提供觸控旋轉／雙指縮放／點角色、完整計時與聊天；音效與設定保留觸控入口。
- 手機輸入使用 16px，聊天依 visualViewport 與安全區調整；小螢幕可捲動。加入 manifest 與主畫面圖示資訊，未提供離線快取或背景執行。

## 最終結果

| 檢查 | 結果 |
|---|---|
| TypeScript／ESLint／production build／npm ls | 通過 |
| Vitest | 21 通過，5 個檔案 |
| 原有 Web E2E | 6 通過，0 跳過 |
| 手機觸控 E2E | 3 通過，0 跳過 |
| Electron production 整合 | 1 通過，0 跳過 |
| 開發服務區網 API 請求 | 通過 |
| 正式網站區網 HTML 與同源聊天請求 | 通過 |

手機測試直接使用 production 網頁伺服器，尺寸為 360×640、390×844、844×390，啟用 mobile／touch，透過 CDP 真正送出 touchStart／touchMove／touchEnd，驗證旋轉與雙指縮放造成相機變動，tap 角色觸發 happy，再操作設定、計時、縮小可見區域與聊天。實際檢視 phone-*-touch.png、phone-*-chat.png。較小 viewport 僅模擬鍵盤空間，不等同 iPhone／Android 原生鍵盤驗收。

runner 原始輸出：mobile-results.json、web-results.json、electron-results.json；完整靜態與單元檢查：mobile-check.log。最初回歸啟動遇到前次 API 程序仍占用 3001，確認並停止本專案舊程序後，重啟新版服務並重跑，最終 6 項皆通過。

## 限制

- 未取得 Render／其他託管帳號授權，沒有真正可分享的公開網址；render.yaml 是可部署設定，不能視為已部署成功。
- 原始碼仍在目前工作區，尚未推送 GitHub。部署前需要將程式存入儲存庫，再由託管服務連接發布。
- 未以實體 iPhone／Android 或 iOS WebKit 執行測試；真實鍵盤、安全區、GPU 效能須待公開網址建立後實機確認。
- 真實 LLM 仍需後端 Key；沒有 Key 時可使用 Mock，不宣稱生成式 AI 已實測。
- 原先 release/Windows ZIP 為先前桌面原型產物，本次未重打包；手機應使用目前原始碼建置的網頁，不能使用 Windows ZIP。
- 環境 start_skill 已保存手機啟動與測試指示，未發布環境快照或網站。
