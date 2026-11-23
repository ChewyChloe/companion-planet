# 用手機開啟同頻星球

推薦使用 **公開 HTTPS 網址**：iPhone 的 Safari、Android 的 Chrome 直接開啟即可，無須安裝 Windows 程式或與電腦連同一個 Wi-Fi。網頁版具備星球、角色觸控、計時與聊天；系統置頂桌寵屬於 Windows Electron 功能。

目前已提供可部署程式與 Render 設定，**尚未發布公開網站**。雲端工作區的 localhost 或私有 IP 不是手機可直接連線的公開網址。

## 公開網址（推薦 Render）

1. 將目前原始碼提交並推送到自己的 GitHub 儲存庫。部署時請確認 Render 選用的分支已包含最新提交。
2. 在 Render 建立 Node Web Service，連接該 GitHub 儲存庫；亦可使用專案根目錄 `render.yaml` Blueprint。
3. 設定 Build Command：`ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci && npm run build`，Start Command：`npm start`，Node 版本：24.22.3。跳過的是網頁建置不需要的 Electron 二進位下載，未跳過已使用套件的 TLS／checksum 驗證。
4. 取得平台分配的 HTTPS 網址後，將環境變數 `WEB_ORIGINS` 設為該完整來源，例如 `https://你的服務名稱.onrender.com`。若使用自訂網域，可用逗號分隔加入。只填 scheme＋hostname＋可選 port，不加路徑、帳號密碼或萬用字元。
5. 儲存設定並重新部署。用手機開啟該網址，先確認畫面與本機陪伴模式可用，再測試計時、聊天與旋轉。`PORT` 使用平台注入值，不需硬設。
6. 想啟用真實 LLM 時，才在 Render 的私密環境設定加入 `LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL`。不設定即可使用 Mock，請勿把 Key 放到 VITE 變數或 Git。

Render 是可用的部署選項，方案、費用、休眠及啟動時間以平台當時設定為準；本次沒有建立任何付費服務或傳送憑證。尚未取得託管授權，因此不能宣稱部署成功。

## 同一個 Wi-Fi 的開發／展示

在自己的電腦執行：

```sh
npm ci
npm run build
npm start
```

伺服器預設監聽 8080。終端會列出本機網路介面地址；手機連同一 Wi-Fi，使用**該電腦 Wi-Fi 的 IP＋8080 埠**開啟。請勿在手機輸入 localhost，它指的是手機本身。若有防火牆提示，僅在可信任的私人網路允許。此方式不需要公開到 Internet，也不需要路由器轉發。

開發時也可使用 `npm run dev` 所列的本機網路地址（5173）；聊天透過同源代理到 loopback API。已修正區網 Host／Origin 被舊本機限制拒絕的問題。正式手機版使用 `npm start`，不公開 Vite 開發服務。

## 手機操作

- 一指拖曳星球旋轉，兩指縮放；直接點星雲仔打招呼。
- 星球以外的區域可捲動；較小／橫向螢幕可往下捲到計時和聊天。
- 安靜、聲音、設定保留可觸控按鈕。音效需先由使用者點擊開啟。
- 聊天依可見視窗高度調整，輸入字級 16px，避免 iOS 輸入時自動放大。原生鍵盤的實際行為仍須 iPhone／Android 實機確認。
- 網站可由瀏覽器選單加入主畫面；目前沒有離線快取或背景通知，不宣稱關閉瀏覽器後仍能持續動畫。重新開啟時，依截止時間恢復計時。

## 驗收

`npm run build && npm run test:mobile`：以正式網頁伺服器，模擬 360×640、390×844、844×390，啟用 mobile／touch，透過實際 touch 事件旋轉、點角色，測試計時、設定與較小視窗中的聊天。不是實體手機或 iOS WebKit 驗證。結果與截圖在 `artifacts/mobile-*` 及 `artifacts/phone-*`。
