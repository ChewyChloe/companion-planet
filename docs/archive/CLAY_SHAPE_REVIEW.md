> 最新範圍：九隻灰模已確認；目前只測星雲仔材質，暫停其他八隻上色與新動畫。詳見 [NEBULA_MATERIAL_REVIEW.md](NEBULA_MATERIAL_REVIEW.md)。本頁保留灰模階段紀錄。

> 歷史紀錄：本頁描述上一輪三角色灰模。使用者已確認，續作六隻的最新交付請看 [NINE_CLAY_REVIEW.md](NINE_CLAY_REVIEW.md)。原三隻模型檔保持不變。

# 三角色灰模外觀確認：星雲仔、蕨蕨子、菇菇獸

本輪依使用者最新指示縮小範圍，只處理這三隻的中性灰模。未製作另外六隻，未添加材質效果、骨架、動畫或 AI 行為，未替換正式網站模型。先前未通過的九隻截面模型與未提交整合修改已移出專案，另外保留於工作區 rejected-residents-v2 作為失敗紀錄。

## 幾何方式的修正

之前的逐層半徑截面把每個控制層做成局部平台，形成環狀凸起，頂部半徑又收得過快，導致尖錐。修改插值雖然減少條紋，仍延續錯誤的共同模板，因此本輪不再使用那套生成器。

新方法在完整三維取樣空間中，使用橢球 signed-distance 近似、彎曲變半徑的隱式肢體與 smooth union 融合，再以 marching cubes 取出等值曲面。身體與手腳是在同一個場中生成，不是額外球體掛到主體。模型不使用 Subdivision Surface；Smooth Shading 只呈現曲面法線，不負責消除幾何台階。

- 星雲仔：飽滿圓蛋形、圓頂、厚實側面；兩側短手由肩部垂下，腳部收短；保留不對稱彎觸角。
- 蕨蕨子：低寬麻糬形、較低重心、厚實側掌與寬腳距；保留分層蕨葉。
- 菇菇獸：圓潤厚鐘形、較寬下腹、雙手向前彎收；保留三朵高低不同的蘑菇。

五官各自貼合真實表面，重新設定高度、眼距及小圓眼比例。灰色五官供閱讀造型，無彩色材質、透射、發光、Shader 特效。頭飾也用相同灰色，另附隱藏頭飾比較以檢查身體差異。

## 已執行驗證

| 檢查 | 結果 |
|---|---|
| 三份 GLB 獨立載入及不同身體頂點資料 | Passed |
| 三個身體各為單一連通曲面 | Passed |
| 三個身體非流形邊數均為 0 | Passed |
| 真正 WebGL 正面、45 度、側面共九次渲染 | Passed |
| 渲染／資源載入錯誤 | Passed：最終擷取未記錄錯誤 |
| 實際滑鼠拖曳旋轉，三模型相機位置確實改變 | Passed |
| 正式網站 src / public、番茄鐘與 AI 程式 | 未修改；本輪未重跑正式網站全套回歸 |
| 動畫、蒙皮及材質完成度 | Not Tested：不屬本階段 |
| 無水平階梯、圓潤程度、四肢銜接及概念圖相似度 | Needs Human Review：已檢視六格預覽，仍待使用者外觀確認 |
| 手機實機與效能 | Not Tested |

本輪不是九角色正式完成版。灰模確認前，不製作其餘六隻，也不進入材質、動畫或正式網站整合。

## 查看與檔案

- `artifacts/clay-review/three-clay-front-quarter.png`：三隻同一尺度、同一正交相機；上排正面、下排 45 度。
- `artifacts/clay-review/three-bare-bodies.png`：隱藏頭飾的身體比較。
- `artifacts/clay-review/<id>-front.png`、`<id>-quarter.png`、`<id>-side.png`：未修圖的實際渲染。
- `artifacts/clay-review/viewer.html`：獨立灰模驗收頁，開發服務啟動後前往 `/artifacts/clay-review/viewer.html`，可滑鼠／觸控旋轉，切角度、隱藏頭飾與下載 GLB。未接入 React 角色或主站導航。
- `assets/art/clay-stage/<id>.blend`、`<id>.glb`：可編輯原檔與獨立模型。
- `assets/art/clay-stage/<id>-field.json`、`<id>-build.json`：取樣密度、幾何雜湊、連通性及封閉性紀錄。
- `artifacts/clay-review/visual-results.json`、`test-report.json`：本輪測量資料，不沿用上一輪測試數量。

## 重現

Python 需 numpy 與 scikit-image，Blender 使用 4.3.2。先執行 `python3 scripts/sculpt-clay-sdf.py`，再分別：

```sh
blender -b --factory-startup --python scripts/build-clay-review.py -- nebula
blender -b --factory-startup --python scripts/build-clay-review.py -- fern
blender -b --factory-startup --python scripts/build-clay-review.py -- mushroom
```

啟動既有 Vite 開發服務後，執行 `node scripts/capture-clay-review.mjs`、`python3 scripts/compose-clay-review.py`（需 Pillow）、`python3 scripts/verify-clay-stage.py`。

取樣間距 0.01，減面只用於控制即時檢視的三角形數；正式動畫拓樸與效能優化尚未進行。各 GLB 沒有骨架或動畫，避免將尚待確認的外觀當成正式遊戲模型。

先前已實際閱讀的 GitHub 案例研究保存在 `assets/art/clay-stage/REFERENCE_NOTES.md`；它們是提示詞研究，並不代表本輪已實現軟體物理或體積 SSS。
