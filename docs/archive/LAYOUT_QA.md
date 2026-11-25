# 全螢幕湖畔版面驗收

2026-11-24（台北）。44 項自動化測試通過：單元 28、Web 6、手機觸控 3、版面／字型 6、Electron 1。依使用者本輪貼附的 Gemini 參考圖，將原三欄紙感頁改為全螢幕、淡紫至暖桃色天空、下方小島與水面。這張新參考取代先前的方角／無漸層介面方向；Huninn、本機備援字型及 SVG 圖示維持。

## 實際變更

- 左上：時間、開始／暫停、安靜陪伴；點時間開啟時長與重設。右上：設定、環境音。右下：聊天、迷你陪伴。
- 桌機與橫向畫面將場景安排在左下；窄螢幕置中靠下，中央留白。移除原先大標題、介紹欄與常駐番茄鐘卡片。
- 沿用加厚版星雲仔、骨架／坐姿修形、桌椅、書本、植物與既有行為；新增真正 3D 岸坡、圓丘、水面及平面倒影。沒有把參考圖片當背景或角色模型。
- 水面倒影來自同一個 Three.js 場景，512×256，靜止時約每 700ms 更新；相機移動立即更新。減少動畫時水波停止，倒影更新降為 2 秒，原生桌寵不載入湖面。
- 修正地表與岸坡的三角形朝向，讓草地頂點色與岸坡正常從上方顯示；新增朝上法線／外緣沒入水面的測試。
- 低 FPS 下將移動插值與細部動畫時鐘分開，避免角色前往書桌的實際等待過久。時長選單改用明確的 label／select 關聯。

## 驗收與證據

| 項目 | 結果 | 證據 |
|---|---|---|
| 全螢幕、中央留白、角落控制 | Passed | 六尺寸真實畫面；自動檢查 Canvas 填滿視窗、無溢出、角色位置未被 HTML 控制遮擋 |
| 桌機／平板／手機構圖 | Passed | 1440×900、1824×1361、1024×768、390×844、360×640、844×390 |
| Huninn 與所有字型下載失敗的備援 | Passed | 版面測試檢查本機 WOFF2 及完全阻擋字型時的計時文字／按鈕 |
| 計時、暫停／保存、安靜、AI 建議確認 | Passed | 使用真實 DOM 操作；沒有改寫計時或 AI 權限規則 |
| 觸控旋轉、雙指縮放、角色點擊與聊天輸入 | Passed | 正式建置的 Chromium 觸控測試；原生手機鍵盤仍待實機確認 |
| Electron 模式切換及透明桌寵 | Passed | Linux 原生視窗測試，未當作 Windows 合成效果的證明 |
| 與離線概念渲染的材質／細節相似度 | Needs Human Review | 參考圖為美術方向，未宣稱完全重現 |
| 真實手機 GPU、長時間耗電、原生鍵盤 | Not Tested | 雲端使用軟體渲染，不能推論實機 FPS |
| Render 最新線上部署 | Not Tested | 原始碼推送不等於已完成線上驗證 |

- [桌機](../../artifacts/layout/desktop.png)／[大螢幕](../../artifacts/layout/wide.png)／[平板](../../artifacts/layout/tablet.png)
- [手機](../../artifacts/layout/phone.png)／[小手機](../../artifacts/layout/small-phone.png)／[橫向](../../artifacts/layout/landscape.png)
- [修改前後](../../artifacts/layout/before-after.png)
- [六尺寸實際畫面檢查](../../artifacts/layout/visual-results.json)／[自動化測試彙總](../../artifacts/layout/test-report.json)

審閱圖以同一個真正 R3F renderer 暫停當前姿態、DPR 1 重繪擷取；正常執行仍使用自動 DPR。倒影有解析度與更新頻率限制，並非離線光線追蹤效果。

## 重跑

啟動 `npm run dev` 後執行 `node scripts/review-layout.mjs` 擷取六尺寸。一般驗證：

```sh
npm run check
npm test -- --reporter=json --outputFile=artifacts/layout/unit-results.json
npx playwright test --config=playwright.design.config.ts
npm run test:e2e
npm run test:mobile
# 需要桌面顯示器；雲端測試以 Xvfb 提供
npm run test:electron
node scripts/report-layout-tests.mjs
python scripts/compare-layout.py
```

攝影需要 Chromium（CHROMIUM_PATH 可覆寫預設路徑），比較板需要 Pillow。一般使用／Render 建置不需要 Pillow 或 Blender。先前 ART_AUDIT.md 與 VISUAL_QA.md 保留 3D 美術迭代證據；本輪版面以本文件及 artifacts/layout 為準。
