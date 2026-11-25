# 同頻星球：三項獨立 Blender 灰模能力驗證

**這一輪沒有通過整體造型品質驗證，不建議進入完整星球製作。**

三件均已實際建模、渲染與匯出；技術檢查與造型品質分開判斷。沒有新增整座星球、正式材質、動畫或網站整合。原圖已正常讀取且封裝於各 `.blend`，來源及裁切記錄見 [原圖分析](REFERENCE_ANALYSIS.md) 與 [來源清單](references/manifest.json)。

## 逐件交付

| 試件 | 原始檔 | 獨立模型 | 四視角 | 原圖並排 |
|---|---|---|---|---|
| 巨樹樹屋 | [treehouse.blend](../../../assets/art/planet-rebuild/capability-v1/treehouse/treehouse.blend) | [treehouse.glb](../../../assets/art/planet-rebuild/capability-v1/treehouse/treehouse.glb) | [四視角](treehouse/four-views.jpg) | [比較](treehouse/reference-comparison.jpg) |
| 分層島體 | [island.blend](../../../assets/art/planet-rebuild/capability-v1/island/island.blend) | [island.glb](../../../assets/art/planet-rebuild/capability-v1/island/island.glb) | [四視角](island/four-views.jpg) | [比較](island/reference-comparison.jpg) |
| 天文台 | [observatory.blend](../../../assets/art/planet-rebuild/capability-v1/observatory/observatory.blend) | [observatory.glb](../../../assets/art/planet-rebuild/capability-v1/observatory/observatory.glb) | [四視角](observatory/four-views.jpg) | [比較](observatory/reference-comparison.jpg) |

原始四張 PNG 分別為各試件目錄的 quarter、front、side、back。45 度是水平轉角 45 度，俯角約 23.7 度；正側背為正交平視。比較圖有置中縮放，不代表已完成參考圖的相機標定或逐像素匹配。

## 巨樹與樹屋

實際方法：逐根指定截面與半徑的根幹／分枝曲線，轉網格後體素焊接、表面放鬆；樹冠以獨立團塊控制形體。入口、門窗及刻線用體積布林，階梯及入口保留分件，施工曲線保存在隱藏 collection。

已有：單一連續根幹表面、分叉、立體樹冠、凹入樹幹的入口、獨立門窗及階梯。

尚未達成：樹冠大小團塊的節奏仍較粗，主幹／根部缺少參考圖的扭轉、細緻轉折與木紋雕刻；入口在不同角度仍顯得過於獨立，尚未自然融入樹幹。部分刻線不夠自然。

**參考造型自評：Failed。** 技術上的根幹連通不等於雕塑造型達標。

## 分層懸浮島體

實際方法：手定不對稱邊界、連續高差曲面、封閉偏移環列岩體拓樸與寬倒角；懸挑使用獨立指定的岩塊形體，洞穴及池面是真正體積切除；瀑布是沿曲線取樣並有表面起伏的靜態網格。

已有：上層高差、懸挑岩體、實際洞穴、前伸下層平台、池面及踏石、瀑布落差。

尚未達成：上層仍過於平滑，岩層仍偏向規則外殼，缺少原圖厚實、相互咬合的岩塊和自然坡面；下層平台與主島體的連結不夠有機。水流形態亦較僵硬，不能視為正式水體成果。

**參考造型自評：Failed。** 這件只含地質／水域，不以沒有建築為缺件理由；失敗原因是地質造型本身的差距。

## 天文台

實際方法：自訂旋轉剖面建立分層基座與飾線；完整半球子午肋架、柱拱、獨立面板；鏡筒使用中空剖面網格，含內縮鏡面、俯仰托架、三腳架、調焦零件與階梯。

已有：基座、階梯、半球圓頂、頂星、柱拱、望遠鏡分件及結構細節。面板只有中性低 alpha，用於看清內部，不是正式玻璃材質。

尚未達成：肋架、柱腳、星飾及階梯的比例仍須對照原圖確認。新增的柱拱對應文字要求，但原圖本身主要是細子午肋架，不能宣稱完全一致。後方機構為圖中遮蔽部分的推導。

**參考造型自評：Needs Human Review。** 不自行標記 Passed。

## 能力限制與可執行替代流程

這次實際使用 Blender Python 的曲線、網格、體素和布林工具，**未進行互動式筆刷雕刻或手工四邊面拓樸製作**。目前這套自動化造型流程沒有達到原圖的有機雕塑精細度；繼續增加基本體、細分或裝飾不能補上這項差距。

更可行的下一步是：

1. 在可實際操控的 Blender 雕刻工作環境，先以原圖校準主視角與輪廓；針對樹根分叉、樹冠邊緣與岩塊交接逐件雕刻，而不是整座腳本批量生成。
2. 由具備有機雕刻／拓樸能力的建模者使用本次可編輯母版、施工曲線與已封裝原圖加工；母版只是交接資料，不要求保留目前不合格外形。
3. 建築採精確曲面與剖面建模，再做接合及細節；完成後對照全部視角，才做即時網格整理與 GLB。
4. 若採外部資產或圖生 3D，必須先確認可使用的服務／授權、實際取得原始模型，並進行修模和同樣的四視角驗收。目前沒有取得外部高品質模型，也沒有宣稱具備可直接產出同等雕刻品質的服務能力。

這些是替代流程，不是已執行成果。在使用者確認前，不擴充整座星球、不開始正式材質或動畫、不替換網站資產。

## 技術驗證（不代表美術核准）

實際 Blender GLB 回匯結果見 [technical-validation.json](technical-validation.json)。檢查來源及回匯網格座標有限、GLB 緩衝內嵌、沒有動畫、來源／回匯包圍盒一致、原圖已封裝及主幹連通性。檔案雜湊與分件清單在各試件 report.json。

技術通過不能取代上述 Failed／Needs Human Review，也不能當作使用者核准。

三件為造型試件，尚未製作 LOD 或完成即時渲染效能測量；GLB 匯出／回匯成功不代表可直接作為手機正式資產。
