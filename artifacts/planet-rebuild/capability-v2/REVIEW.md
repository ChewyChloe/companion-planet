# 巨樹樹屋第二版 — 未通過／停止後續製作

本版已由使用者退回，不是可進入後續製作的驗收成果。四視角與來源檔僅作失敗記錄保留。

本輪僅有巨樹樹屋。分層島體與天文台保持第一版；未製作完整星球、正式材質、動畫或網站整合。

## 可檢視輸出

- [原圖／第二版 45 度並排](treehouse/reference-comparison.jpg)
- [四視角](treehouse/four-views.jpg)
- [45 度原始渲染](treehouse/quarter.png)、[正面](treehouse/front.png)、[側面](treehouse/side.png)、[背面](treehouse/back.png)
- [Blender 原始檔](../../../assets/art/planet-rebuild/capability-v2/treehouse/treehouse.blend)
- [獨立 GLB](../../../assets/art/planet-rebuild/capability-v2/treehouse/treehouse.glb)
- [模型分件／方法報告](../../../assets/art/planet-rebuild/capability-v2/treehouse/report.json)
- [技術檢查](technical-validation.json)、[其他資產與網站凍結檢查](scope-verification.json)

## 實際參考與比例分析

實際讀取 `assets/art/planet-rebuild/references/companion-planet/同頻星球.png`，1536×1024，SHA256 `2acdabb6c2b7bf0de43b90aa508d3568e54bdd56ef990bee1787130ff7b2c2b6`。原圖完整封裝於 .blend。

使用原圖 (128,76)–(593,454) 的樹屋裁切作輪廓比較，沒有生成替代設計圖。原圖樹冠橫向舒展、頂部略偏右；前緣較低，小雲團遮住部分分枝。主幹短而粗，左右生長紋交纏，在分叉之間留下透空。入口約佔樹冠寬度的六分之一，嵌入前側根部；圓窗、拱頂和階梯應形成同一動線。原圖完整星球中的周邊植栽不屬本獨立試件。

本次保留這些構圖原則，背面及被遮擋的結構需推導；原圖與 45 度驗收相機並未標定。比較圖各自置中縮放，不能作逐像素精度證據。

## 建模方法與能力評估

第一個內部測試使用 Blender 原生 Skin 分枝拓撲。實際渲染後發現高分枝度的根部產生薄片狀突起，已淘汰，不作交付成果。

交付版改為 **平滑融合的隱式曲面**：以獨立設計的三條彎曲生長柱、逐段變細的根系及分枝定義三維密度場，透過 smooth-min 融合，marching cubes 提取連續表面。主幹取樣間距 0.032 m；未使用 Subdivision Surface。寬而不等距的淺生長溝槽直接改變頂點，避免第一版的深布林刻痕。這些方法解決分叉焊接與根部薄片問題，但不等於完成手工雕塑。

樹冠為 15 個位置、大小和前後層次分開設計的雲團，每團是數個寬圓生長體平滑融合後的封閉曲面，而非將可見球體直接堆在樹上。門洞以布林挖入樹幹，門板、圓窗、窗格與踏階分件；踏階與入口共同旋轉對齊。

所有結果由 Blender 實際輸出；沒有使用生成圖片、平面貼圖冒充模型。当前對話沒有可呼叫的 Higgsfield 工具，因此未使用或驗證其 3D 輸出。沒有進行互動式筆刷雕刻。

## 驗收狀態與仍需確認的差距

| 項目 | 狀態 | 說明 |
| --- | --- | --- |
| 根部至分枝連續表面 | Failed | 已由四視角確認先前薄片突起消除；藝術自然度仍待判斷。拓撲另見技術報告。 |
| 扭轉與交纏 | Failed | 有彎曲生長柱與分叉；與原圖相比，主幹仍偏簡化，交纏力度不足。 |
| 樹冠層次與輪廓 | Failed | 大小及深度分層已重做；原圖雲團更細密、橫向舒展更自然，仍有差距。 |
| 樹洞入口融合 | Failed | 使用內凹門洞並對齊落地踏階；原圖外緣更像樹幹自身長成，需人工確認。 |
| 原圖輪廓與比例 | Failed | 已提供真實並排；未宣稱達到參考圖完成度。 |
| 正式材質／動畫／網站整合 | Not Tested | 依本輪範圍未製作。 |

若要接近原圖的手塑完成度，下一步應在這個可編輯 .blend 上由雕塑工作流程重塑主幹的生長脊線與樹冠個別雲團，必要時使用 Blender Sculpt Mode 的 Grab／Clay Strips／Crease 配合低解析度重拓撲。這需要實際人工筆刷操作與逐角度美術修形；目前的腳本曲面方法尚不能替代這種控制。本次不把技術檢查通過當作美術驗收通過，也不據此推進其他試件。

## 重現

使用 Blender 4.3.2，以及 `scripts/modeling-trials-v2/requirements.txt` 中的 Python 套件。先在可寫虛擬環境安裝依賴，再依序執行：

```sh
python scripts/modeling-trials-v2/implicit_trunk.py
python scripts/modeling-trials-v2/implicit_canopy.py
blender -b -t 4 --python scripts/modeling-trials-v2/run.py
blender -b -t 4 --python scripts/modeling-trials-v2/validate.py
python scripts/modeling-trials-v2/compose_review.py
```

灰模 Cycles CPU 渲染，固定中性三點光，45 度 96 samples，其餘 64 samples；沒有 Bloom 或霧氣掩蓋輪廓。網站測試未重跑，因本次沒有改動網站；凍結檢查記錄所有受保護檔案雜湊。

## 後續執行阻礙（2026-11-25）

環境狀態回報支援共享桌面，但本對話未提供桌面操作工具；亦沒有可呼叫的 Higgsfield、Tripo、Meshy 或其他圖像轉 3D 工具。Blender 命令列可用，並不代表可以執行人工筆刷雕塑，或具備達到參考品質的建模能力。

依 Cloud desktop 技能診斷：桌面相關程式已存在，不能據此宣稱環境缺少安裝，亦不應自行繞過工具介面啟用插件。可嘗試在同一雲端環境另開有桌面操作工具的對話，保留目前工作區。但工具可用仍不代表美術品質必然達標，須先驗證單一主幹造型。另一條可執行路徑是由圖像轉 3D 服務輸出實際 GLB 後，再進行 Blender 修形及輪廓驗收；本對話尚未取得該服務能力或模型。

在上述能力實際可用前，不再沿用失敗的腳本生成第三版，不處理其他試件或網站。
