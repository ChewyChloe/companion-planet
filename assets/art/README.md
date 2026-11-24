# 星雲仔可編輯美術來源

`nebula-sculpt.blend` 是 Blender 4.3.2 可編輯網格、皮膚權重與骨架；`public/models/nebula-sculpt.glb` 是執行期資產。全部為本專案原創建模，沒有下載第三方角色。

從專案根目錄重建：

```sh
BLENDER_USER_CONFIG=/tmp/companion-blender-config blender -b --factory-startup -t 2 --python scripts/build-character.py
```

`character-look.json` 的參數分兩種，不是所有設定都即時生效：

- `bodyWidth`, `bodyHeight`, `antennaLength`, `eyeSpacing`, `eyeScale`, `materialOpacity`, `surfaceRoughness`, `subsurfaceAppearance`：R3F 載入時調整。重新整理以檢視。觸角長度也會改變圓頭位置；眼距／眼大小會改變真正的控制節點。
- `bodyDepth`, `bodyRoundness`, `antennaCurvature`, `armLength`, `legLength`：重建 Blender 模型後生效，影響真正的網格、曲線與融合輪廓。

軸向 glTF Y-up，+Z 正面，腳底接近 Y=0。連續 Body 為單一 SkinnedMesh，手臂與腿由柔和權重帶動；五官與觸角跟隨 BodyControl。Belly 是表皮頂點色區域的語意節點，不另貼白色球片。未使用透明皮膚；subsurfaceAppearance 是微弱邊緣柔光近似，不是真正體積散射。過度增加透明度會有排序限制，正式預設維持 1。

主概念來自提案 PDF 第 3 頁及使用者 11/24 追加的五張可見概念圖／兩支 Tripo 影片。第二支影片提供書桌場景側背面，但沒有完整中立姿態的角色四視設計。四視角與參考對照請見 artifacts/art；造型比例與柔軟度仍需要人工美術驗收。

`?art-review&view=front|side|back|quarter&pose=idle|walk|read|rest|happy|listen|stretch|approach|return` 只在 Vite 開發環境提供，使用同一真正 R3F 模型，正式建置不提供測試入口。`node scripts/visual-qa.mjs` 擷取四視角與完整應用畫面，結果在 artifacts/art/visual-results.json。

弱裝置的 RenderQuality 會在暖機後量測 FPS，逐步降低 Canvas DPR 至最低 0.7；UI 文字解析度不變。陰影為單一 512px 貼圖，每秒最多更新五次。

坐姿使用 Seated morph target（含法線），由 Blender 產生屈腿、鄰接平滑與局部座面壓縮。讀書及靠近椅面時混合修形，步態仍由骨架控制，以免大角度彎折產生銳利內腿摺痕。

載入器使用原生 GLTFLoader，正式資產不含 Meshopt／Draco 壓縮，不會為未使用的解碼器啟動 WebAssembly，也不需要放寬 CSP。

依使用者側面過扁的回饋，bodyDepth=1.25 實際加深前後輪廓；model-build.json 量測中段軀幹厚寬比約 0.93。桌子前移、椅背後移、座面加深與閱讀姿態同步檢查，避免增加體積後撞桌椅。

閱讀使用自然坐姿、雙手放鬆及頭／眼／手部微動；曾嘗試的前伸 Reading 修形在實際截圖中造成肩部摺疊，已移除，正式資產僅含 Seated 修形。桌上書本保留；桌寵專注狀態以低頭微動表現。尚未實作貼書手勢與翻頁。
