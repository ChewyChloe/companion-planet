# 星雲仔：實際 R3F 果凍材質測試

目前範圍只有星雲仔的材質。九角色灰模已由使用者確認；之後使用者明確要求先只測星雲仔，因此沒有上色其他八隻，也沒有進入新動畫階段。

## 模型保持不變

`public/models/material-preview/nebula.glb` 是隔離的測試資產。它與確認過的 `assets/art/clay-stage/nebula.glb` 身體 POSITION 緩衝皆為 24,458 個頂點，SHA-256 同為：

`50efb36d5c405b73b7432fd33d2926092204b31ea311139e2fd8c9835bf8c729`

沒有重新建模或調整身體比例、觸角、眼睛、嘴巴。測試模型沒有動畫 clips，測試模式固定姿態與材質時間；原有動畫程式僅在一般模式執行。原灰模檔案仍保留。

## 案例研究

實際讀取使用者指定的 [果凍叢林案例](https://github.com/TripoGrowthLab/awesome-3d-prompts/blob/main/docs/catalog.zh.10.md#jelly-jungle-3d-browser-game-2081024333120733188) 原文，並查看其儲存庫預覽圖。該案例文字強調糖果粉、軟乙烯基、細微環境反射、柔和陰影與清楚五官，沒有提供可直接搬用的果凍 Shader。此處參考其柔軟糖果質感，但以使用者更明確的「看得出內部深度的半透明星雲」要求作為實作目標，保留原有藍白主題。

## 三種實際材質

| 方案 | Roughness | 桌面 Transmission | Thickness | 方向 |
|---|---:|---:|---:|---|
| A 柔霧果凍 | 0.46 | 0.28 | 0.72 | 較乳白，背景透射較弱 |
| B 星雲果凍 | 0.23 | 0.72 | 0.68 | 中等透明，內部雲氣較濃，能透出部分背景 |
| C 清透果凍 | 0.10 | 0.94 | 0.58 | 較高透射與更清楚的背景折射，保留藍色厚度 |

桌面使用真正 MeshPhysicalMaterial 透射、折射、厚度與吸收，不是只修改顏色或 alpha。Fresnel／霧色為即時近似。手機採明確標示的輕量薄殼，透明度分別 0.90／0.68／0.48，折射不會完全等同桌面；不宣稱實機效能已驗收。

### 內部空間與排序

- 身體內另有一個三維密度場，以 28 步 raymarch 取樣藍紫、青綠雲氣，沒有使用表面星雲貼圖或 Blender 渲染代替瀏覽器。
- 18 顆細星位於實際不同深度的位置，收在身體內部，不貼在表面。星點受外殼透射影響，搭配少量高亮 Bloom。
- Bloom 使用實際 UnrealBloomPass，強度 0.14、閾值 1.25，不以大範圍白光遮蓋角色。
- 眼睛、嘴巴與臉頰在透射外殼之後繪製，alpha 固定為 1。它們從透射背景 pass 排除，避免被角色自己的折射複製成額頭重影；內部雲氣仍保留深度測試，避免穿到前景家具／五官上。
- 內部雲氣採體積取樣後的透明合成，並非完整光線追蹤、物理耦合的體積散射或離線 SSS。

## 直接在網站確認

原網站網址後加：

- `?nebula-material=soft`
- `?nebula-material=mist`
- `?nebula-material=gel`

這是原本的 React Three Fiber 星球 Scene、天空、家具、環境光與檯燈，不是另一張背景圖。頁面提供 A／B／C 切換、近照與離開測試。未帶參數的一般網站繼續使用既有模型／材質，其他八隻未改。

近照：`?art-review&nebula-material=mist`。加入 `&material-probe` 可在角色後放同一張中性條紋卡，確認背景是否真的透過身體並產生折射；卡片只是校準物件，不是正式場景裝飾。

## 比較圖與測試

- [三種近照](artifacts/nebula-material/three-browser-materials.png)
- [實際星球場景](artifacts/nebula-material/three-live-planets.png)
- [相同背景卡的透射對照](artifacts/nebula-material/three-transmission-probes.png)
- [手機 B 方案](artifacts/nebula-material/mist-phone.png)
- `artifacts/nebula-material/visual-results.json`：十個實際瀏覽器渲染紀錄，包含攝影機、姿態、透射參數、內部星點數及 WebGL error。

三組比較固定相同攝影機、角色位置／姿態與光照；截圖使用同一個實際 Composer 最終管線，包含 Bloom，沒有另用直接渲染繞過後處理。近照合成只採相同裁切，未修圖或生成補畫。原始完整瀏覽器截圖一併保留。

`npm run check` 檢查型別、Lint、38 項單元／整合測試與正式建置。新增檢查包含明確參數才能進入測試、拒絕 prototype 名稱、原灰模幾何相同、無動畫 clips，以及桌面／手機材質差異。預設網站回歸結果另存本資料夾。

材質審美與 B／C 的最終選擇仍為 Needs Human Review。Render 最新部署與真實手機 GPU 效能未在此雲端環境驗證。

## 本輪最終結果

- `npm run check`：Passed，38 項單元／整合測試、型別、Lint、正式建置與相依檢查通過。
- 未開啟材質測試的桌面網站回歸：3 Passed、0 Failed、0 Skipped，涵蓋場景操作、角色點擊、番茄鐘、對話、靜音、AI 設定確認及離線／桌寵切換。
- 正式 production server 的材質實景與近照入口：2 Passed，未記錄頁面錯誤。
- 實際 R3F 渲染：10 份，未記錄 WebGL 錯誤；同組三方案攝影機與姿態資料完全一致。
- Render 遠端部署：Not Tested。

另提供 `nebula-material-browser-review.zip`，內含本專案實際正式前端建置與比較圖，可在本機以簡單靜態伺服器確認材質。這個離線測試包不包含 AI 後端服務。
