# 同頻星球：3D 美術驗收

> 本文件保留 8ddeb5f 的 3D 美術重製紀錄。後續使用者要求改為全螢幕湖畔版面，新的構圖、控制入口與版面測試以 [LAYOUT_QA.md](LAYOUT_QA.md) 為準，先前紙感／無漸層版面規則已由新參考取代。

日期：2026-11-24（台北）。自動化回歸：43 項通過（單元 27、Web 6、手機觸控 3、版面／字型 6、Electron 1），另完成 9 動作與 4 視角擷取。這是實際可互動模型的技術驗收與美術審閱交付；不是原概念圖已完全重現的宣告。

## 驗收表

| 項目 | 狀態 | 實際證據與限制 |
|---|---|---|
| 角色輪廓 | Needs Human Review | 四視角已逐張檢視，依新增概念改為圓厚豆形、下垂短手、小腳與水滴觸角。Tripo 書桌轉台提供側背參考，但沒有完整中立姿態設定；仍需確認辨識度與相似度。 |
| 角色比例 | Needs Human Review | 新增參考後重新建模，縮短四肢、加寬主體，依側面回饋加深前後厚度；中段實測厚寬比約 0.93。不是只改材質；最終圓胖程度、眼距與觸角曲率待美術確認。 |
| 部件銜接 | Passed | 真正單一連續 Body SkinnedMesh，手腳與軀幹融合；四視角未見分離球體縫隙或破洞。五官投影實際表面，腹部是同一表皮的頂點色。深屈腿改用含法線的 Seated 修形；輕微腋部摺線仍可人工微調。 |
| 角色材質 | Needs Human Review | 不透明柔光近似、淡藍三維雲紋、分區粗糙度／高光，沒有透明排序問題。與參考中的高透明、內部發光星雲凝膠仍有差距，不能標成完全相同。 |
| 星球地形 | Passed | 實際自訂岩體起伏／凹坑、連續苔地／土壤色區、法線細節與彎曲草葉；可旋轉觀察完整岩體。不是普通綠球或靜態背景。 |
| 家具 | Passed | 桌椅厚度／倒角／木紋、靠背、曲面書頁／書脊／頁緣、彎頸桌燈、厚曲面葉、休息墊。桌椅腳接地、休息墊四角差 <0.001 單位有數值測試。坐姿修形與椅面近照可檢視；讀書時桌面／椅背交疊頂點皆為 0；中央表皮採樣約 0.019 單位輕微壓入座面，不宣稱全表面零交疊。 |
| 燈光 | Passed | Key／Fill／Rim／Hemisphere 分層，單一 512px 接觸陰影每秒最多更新五次，燈罩暖光。沒有 Bloom、過曝、WebGL 編譯或資源失敗；真正的體積散射未實作。 |
| 構圖 | Passed | 桌機／平板／手機下完整星球可見，角色未被 UI 蓋住；讀書位於桌後、書在前方，手臂自然放鬆並有細微動作，未實作貼書手勢／翻頁。四視角、整體、讀書、休息與桌寵皆有真實截圖。 |
| 動畫 | Passed | 9 個高階動作實際 R3F 抽樣：Idle／Walk／Read／Rest／Happy／Listen／Stretch／Approach／Return；Blink 時序另有測試。全動作兩兩過渡的有限值／連續性、對向步態、坐姿修形、閱讀微動、呼吸／眼睛／觸角已測。自動測試不代表每個中間幀都做過人工審美判斷。 |
| 互動 | Passed | 自主目標、進出書桌雙向避障、角色點擊、拖曳旋轉／觸控雙指縮放、番茄鐘、聊天高階動作限制、安靜模式、暫停保存與兩種模式切換，見測試報告。沒有讓 LLM 逐幀控制。 |
| 效能 | Needs Human Review | 真實軟體渲染約 7.5 FPS，不能視為流暢實機驗收。全星球約 66,552 triangles／46 calls（單次取樣，陰影更新幀可能增加）；模型與植物有批次實例，DPR 1.5 上限、弱裝置自動降至 0.7。一般 GPU、實機手機與長時間耗電仍需測，未宣稱 60 FPS。 |

## 可檢視交付

- [角色前後四視角比較](artifacts/art/character-before-after.png)：上為原型、下為重製；做等高輪廓裁切，原始相機與燈光不同，不是像素級相似度測試。
- 最終原始四視角：[正面](artifacts/art/after/front.png)／[側面](artifacts/art/after/side.png)／[背面](artifacts/art/after/back.png)／[45 度](artifacts/art/after/quarter.png)。
- [側面加厚前後比較](artifacts/art/depth-before-after.png)。
- [完整星球前後比較](artifacts/art/planet-before-after.png)、[新參考與實際模型對照](artifacts/art/new-reference-comparison.png)、[PDF 概念對照](artifacts/art/reference-comparison.png)。
- [閱讀](artifacts/art/after/read.png)、[椅面／手部近照](artifacts/art/after/read-contact.png)、[休息](artifacts/art/after/rest.png)、[手機](artifacts/art/after/mobile.png)。
- [網頁迷你陪伴](artifacts/art/after/pet.png)、[真正 Electron 320×420 桌寵](artifacts/desktop-pet.png)。Linux 測試只確認原生視窗設定／生命週期，未當成 Windows 合成效果的證明。
- 各動作實際截圖位於 artifacts/art/after/pose-*.png；逐動作 pose 抽樣、控制節點、實際 renderer 計數與錯誤紀錄在 [visual-results.json](artifacts/art/visual-results.json)。
- [自動化測試彙總](artifacts/art/test-report.json)、[單元結果](artifacts/art/unit-results.json)、[Web](artifacts/web-results.json)、[Mobile](artifacts/mobile-results.json)、[Design](artifacts/redesign/design-results.json)、[Electron](artifacts/electron-results.json)。
- [美術診斷及修正歷程](ART_AUDIT.md)、[可編輯模型與真實參數說明](assets/art/README.md)。GLB 及 BLEND 隨原始碼提供，Render 不需要安裝 Blender。

四視角使用同一 R3F 資產；整體審閱圖從真正 renderer 暫停當前姿態，以 DPR 1 重繪截取，未替換成靜態概念圖。效能數據採正常自動 DPR 執行，與審閱圖的解析度設定區別記錄。所有字型／版面測試仍驗證淺色紙感、Huninn 本機備援、無 emoji／漸層／玻璃 UI。

## 重跑

```sh
npm ci
npm run dev
# 另一個終端，在開發服務啟動後：
npm run test:visual
python scripts/compare-art.py
npm run check
npm test -- --reporter=json --outputFile=artifacts/art/unit-results.json
npm run test:e2e
npm run test:mobile
npx playwright test --config=playwright.design.config.ts
# 有 Linux 顯示器或實體桌面時：
npm run test:electron
node scripts/report-art-tests.mjs
```

比較板需要 Pillow；模型重建需要 Blender 4.3.2。一般啟動不需要這兩者。test:visual 使用 Chromium，預設 /usr/bin/chromium，可用 CHROMIUM_PATH 指定。

## 尚待人工確認／未測

| 項目 | 狀態 |
|---|---|
| 星雲仔輪廓、手腳比例、水滴觸角及淡藍雲紋是否符合使用者審美 | Needs Human Review |
| 凝膠透光感與參考離線渲染之差距，是否接受目前的不透明近似 | Needs Human Review |
| 真實 iPhone／Android GPU、原生鍵盤、耗電與長時間 WebGL 穩定性 | Not Tested |
| Windows 原生透明合成、拖曳／系統匣與重新封裝的安裝程式 | Not Tested |
| 真實付費 LLM 提供者（回歸測試用 mock／離線回覆） | Not Tested |
| Render 最新部署網址／狀態 | Not Tested |

沒有把未視覺確認或未執行的項目標成 Passed。先前下載過的 Windows ZIP 屬舊版本；本輪交付原始碼／資產並測試 Linux Electron，未宣稱舊 ZIP 已更新。

## 後續九位居民驗證

新互動、九種冠飾、角色切換、拖放、短句與靜音的本輪記錄獨立收於 [INTERACTION_QA.md](INTERACTION_QA.md)。原有照片屬先前美術／版面版本，不作為九位居民已驗證的證明。每一位的最新真實前視渲染與三乘三比較圖位於 artifacts/interaction；風格與參考圖一致程度仍須人工確認。

## 最新同頻星球宇宙版本

本輪丘面、Shader 天空、雲霧、遠方星球、檯燈與九材質的證據以 [UNIVERSE_QA.md](UNIVERSE_QA.md) 及 artifacts/universe 為準。先前湖畔與九角色比較圖是當輪歷史；新的比較圖以本輪實際擷取檔案為準。只有實際執行的功能／渲染檢查標為 Passed；目標插畫的風格相似度、雲水交界與實機效能仍須人工確認。
