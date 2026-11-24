# 外部案例閱讀紀錄

來源：[TripoGrowthLab / awesome-3d-prompts 中文 README](https://github.com/TripoGrowthLab/awesome-3d-prompts/blob/main/README.zh-CN.md)，本輪以 curl 實際取得完整 README 並閱讀下列案例。這是提示詞研究，沒有執行第三方案例，也沒有把其中的效果或 FPS 當成本專案的測量結果。

| 案例 | 原作者標示 | 閱讀重點 | 本輪應用 |
|---|---|---|---|
| 果冻压机 | Vib3Coded | 幾何與半透材質分離、軟體體積限制、抓取優先於鏡頭、手機構圖、無 WebGPU 備援、預熱與效能檢查 | 分開驗證模型／渲染／互動；延用既有手勢與降級，不導入破碎玩法 |
| 在 Blender 中创建 3D 小黄人角色 | EvoLink.ai | bpy 完整生成、分材質、轉台相機及明確影片輸出規格 | 實際 Blender 原檔與 GLB、統一正交相機、多視角驗收；不模仿該角色外觀 |
| 可交互 3D 果冻西瓜切片 | 基恩-Keane | 厚度吸收、Fresnel、折射、內部氣泡、種子隨形變、不浮離、局部形變衰減 | 厚實側面、內部氣泡與表層細節、保留蒙皮連續身體；沒有宣稱完成 XPBD 或真正體積 SSS |

九角色造型以使用者概念圖及本輪角色敘述為主。各角色具體造型決策與未完成部分記錄在 CLAY_SHAPE_REVIEW.md；網站現有 Shader 為即時近似，與離線高品質光傳輸不同。
