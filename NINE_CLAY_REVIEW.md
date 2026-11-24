> 最新範圍：九隻灰模已確認；目前只測星雲仔材質，暫停其他八隻上色與新動畫。詳見 [NEBULA_MATERIAL_REVIEW.md](NEBULA_MATERIAL_REVIEW.md)。本頁保留灰模階段紀錄。

# 同頻星球：九角色灰模外觀確認

使用者已確認上一輪星雲仔、蕨蕨子、菇菇獸的灰模（回覆「可以」），本輪依原流程續作其餘六隻。已確認的三隻 .blend、GLB、曲面資料與建模報告全部保持原位元組，透過 SHA-256 清單檢查。此確認只套用於那三隻的外觀，不代表其餘六隻或材質／動畫也已通過。

本輪交付九份獨立、完整且可旋轉檢視的灰模；尚未製作彩色材質、骨架、動畫或 AI 行為。正式網站的 src / public 沒有修改。

## 新六隻的造型

| 角色 | 身體／四肢 | 頭頂結構 |
|---|---|---|
| 小星草 | 窄肩、飽滿下腹的梨形；一隻小手略抬起，腳小而短 | 有厚度的星芽、彎莖與兩片曲面葉 |
| 極光仔 | 實際傾斜的上身與偏移臀部，左右手高低不同 | 兩片不同大小的彎曲葉 |
| 花苞寶 | 小型圓潤水滴、較圓的臉；雙手向胸前收攏 | 五片立體花瓣、花心與花萼，有各自控制節點 |
| 星塵獸 | 圓角方形的厚身、寬肩、粗短腳，體積較沉重 | 彎曲漸細雙角與細環 |
| 水球仔 | 下腹圓滿、往上延伸的連續彎曲液態尖端，外展上揚小鰭 | 尖端就是身體本身，沒有另外黏上葉片 |
| 蓬蓬仔 | 低矮圓雲、輕微軟圓瓣、短圓手與收短腳 | 帶立體種子傘的蒲公英絲與花心 |

不是只將橢球縮放成不同寬高。梨形的上下體積配置、極光的不對稱、胸前收手、方圓超橢球、液態尖端與圓雲體積皆在各自三維場中獨立定義。

## 幾何與製作

延用已通過方向的 implicit field / smooth union / marching cubes。身體與四肢融合在一個連續場內；不使用逐層橫截面，也沒有 Subdivision Surface。新六隻採各自的橢球／超橢球組合、傾斜變換、彎曲變半徑肢體及融合區域。

生成腳本：`scripts/sculpt-clay-sdf.py`。Blender 匯入、五官貼合、獨立頭飾與匯出：`scripts/build-clay-review.py`。Blender 4.3.2，取樣間距 0.01。中性灰與深灰五官僅供閱讀形體，沒有傳輸、發光或彩色效果。

例如重新生成小星草：

```sh
python3 scripts/sculpt-clay-sdf.py sprout
blender -b --factory-startup --python scripts/build-clay-review.py -- sprout
```

Python 需 numpy、scikit-image；合成圖另需 Pillow。已確認三隻有覆寫保護，只有明確加入 `--rebuild-approved` 才能重新生成，避免重跑腳本意外改掉它們。

## 查看

- `artifacts/clay-review/nine-clay-front.png`：同尺度正面九宮格。
- `artifacts/clay-review/nine-clay-quarter.png`：同尺度 45 度九宮格。
- `artifacts/clay-review/nine-clay-body-only.png`：去頭飾比較；水球仔的液態尖端屬於身體，保留。
- `artifacts/clay-review/<id>-three-views.png`：每隻正、側、背預覽。
- `assets/art/clay-stage/<id>.blend`、`<id>.glb`：九份可編輯模型與獨立載入模型。
- 獨立驗收頁 `/artifacts/clay-review/viewer.html`：拖曳旋轉、縮放、前側背／45 度、隱藏頭飾、下載 GLB。需既有開發服務；下載包另附完整本機檢視器。

所有預覽固定同一正交相機與相同比例尺，沒有把每隻自動放大到同一高度。原先三隻確認用的六格預覽與原下載包仍保留。

## 驗收狀態

實際測量在 `artifacts/clay-review/nine-test-report.json` 及 `nine-visual-results.json`。腳本檢查九份不同身體資料、單一連通與封閉性、原三隻檔案雜湊、實際渲染錯誤，以及正式網站原始碼未修改。

| 項目 | 狀態 |
|---|---|
| 原三隻外觀方向 | Approved by user |
| 新六隻輪廓、幼態比例、手腳連接、與概念圖相似度 | Needs Human Review |
| 九隻灰模整體一致性與小尺寸辨識度 | Needs Human Review |
| 材質、動畫、蒙皮、手機實機效能 | Not Tested：尚未進入該階段 |
| 正式網站回歸 | 本輪未重跑；正式應用程式與既有模型未修改 |

技術檢查通過不等於主觀美術確認。下一階段需先確認新六隻與九隻整體外觀，再製作材質與動畫。
