# 同頻星球：三個建模能力試件

這是獨立灰模能力驗證，不是正式星球資產，也未整合網站。

- `treehouse/`：連續根幹、分層樹冠、樹洞入口與階梯。
- `island/`：地形高差、懸挑岩體、洞穴、下層平台及靜態瀑布。
- `observatory/`：分層基座、圓頂、柱拱、望遠鏡及階梯。

每個目錄包含 `.blend`、獨立 `.glb` 和分件／方法／限制報告。原始 PNG 已封裝在 `.blend` 的影像資料中。施工曲線保留於隱藏的 Construction_guides，最終物件位於 MODEL_* collection；REVIEW_Studio 只供渲染。

完整四視角、比較圖與自評：[REVIEW.md](../../../../artifacts/planet-rebuild/capability-v1/REVIEW.md)。

**自評：樹屋與島體尚未達參考品質；天文台待人工確認。檔案技術檢查通過不代表美術通過。**

重現方式（在專案根目錄，需 Blender 4.3.2）：

```sh
blender -b -t 4 --python scripts/modeling-trials/run.py -- treehouse
blender -b -t 4 --python scripts/modeling-trials/run.py -- island
blender -b -t 4 --python scripts/modeling-trials/run.py -- observatory
blender -b -t 2 --python scripts/modeling-trials/validate.py
python scripts/modeling-trials/compose_review.py
```

原圖位置：`assets/art/planet-rebuild/references/companion-planet/同頻星球.png`。

這輪使用 Blender Python 的指定曲線／網格、體素焊接及布林；沒有互動式筆刷雕刻。不得將這些試件描述為已通過造型品質驗證，亦不得未經使用者確認就擴建整座星球。
