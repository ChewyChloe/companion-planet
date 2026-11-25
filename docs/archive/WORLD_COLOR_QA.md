# 四座星球：上色與渲染

四座主場景已使用彩色 PBR GLB，並非只改背景或把整座模型乘上一個色調。上傳的原始灰模保留不變；本輪也未修改角色、島體、建築或已校正的座位形狀。

| 星球 | 配色與材質 |
|---|---|
| 同頻星球 | 鼠尾草綠樹冠、暖木色樹屋、米色步道、灰褐岩層、藍綠天文台與水體、少量古銅金屬。 |
| 月光書原 | 灰藍樹冠、紫灰岩層、暖象牙月牙、藍色穹頂、紫色書封與奶油紙頁。 |
| 玫瑰花園 | 乾燥玫瑰粉與象牙色花瓣、深淺綠葉、暖白石材、淡青水面、古銅燈具。 |
| 微風森林 | 苔綠植被、棕色樹皮、木桌與步道、亞麻帳篷、灰綠岩壁、青綠瀑布和暖光窗戶。 |

色彩貼圖為 2048；粗糙度、金屬度和真正的 Cycles 24-sample AO 共用 1024 合併貼圖。自發光貼圖為 512，集中在窗戶、星星及燈具。水、石材、木頭、葉片和金屬使用不同粗糙度，沒有提高全場 Bloom 掩蓋細節。

主光源提高位置與陰影覆蓋範圍，使用 1024 陰影圖；降低補光與輪廓光強度，保留表面明暗。夜間提高局部暖色自發光，仍保留原有閱讀檯燈開關。

## 可檢視輸出

- [四座白天實際渲染](../../artifacts/world-color/four-worlds-day.jpg)
- [四座夜景實際渲染](../../artifacts/world-color/four-worlds-night.jpg)
- [上色前後比較](../../artifacts/world-color/before-after.jpg)
- [手機畫面](../../artifacts/world-color/phone-worlds-day.jpg)

以上為實際 React Three Fiber 場景擷取，包含網站的角色與後製流程。原始灰模旋轉檢視 `/?world-model-review` 仍使用未上色的來源檔；正式首頁使用彩色執行副本。

## 驗收範圍

原始檔雜湊與已批准場景的 POSITION／NORMAL／UV／索引緩衝均有自動檢查。材質、編譯、建置與日夜／手機載入檢查，以及旅行、檯燈、角色行走與實際觸控抓放的結果保存於 `artifacts/world-color/`。美術喜好與實體手機 FPS 仍須人工審閱，不以測試成功宣稱完全符合概念圖。

重建用 Python 依賴：NumPy、SciPy、Pillow、trimesh、embreex；AO 烘焙使用 Blender。部署與遊玩只需要已產生的 GLB 和既有 Node 網站服務，使用者不需操作 Blender。


最新自動驗證：48 項單元、12 個日夜／手機渲染案例、4 項互動回歸，以及實際觸控抓放全部通過。結果見 `artifacts/world-color/verification-summary.json`；API 供應商實際付費呼叫與真機 FPS 未在本輪驗證。

### Production texture loading correction (2026-11-25)

Reproduced the user's white-world report with `npm run build` + `npm start`.
The GLBs contained StorybookPaint and embedded images, but the production CSP
blocked GLTFLoader/ImageBitmapLoader's fetches of local `blob:` image URLs.
Consequently all four texture maps were unavailable and the scene rendered white.
Allow `blob:` specifically in `connect-src`; scripts and remote connections remain
restricted. The capture script now accepts BASE_URL/OUTPUT_DIR so the same checks
can target the production server, and reports CSP failures as errors.
Production browser evidence is under `artifacts/world-color/production/`.
