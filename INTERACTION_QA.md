# 拖放、打招呼與九位居民

本輪在既有湖畔 React Three Fiber 場景中加入互動，沒有以圖片取代模型。九位居民沿用連續曲面與同一套骨架、坐姿修形和動畫控制；除星雲仔保留觸角，其餘角色有不同的立體植物／蘑菇／花苞／角／種子冠飾、皮膚配色。水球仔另有貼合曲面的泡泡紋，星塵獸有金色眼睛及表面星點。這是依參考圖推導的可互動造型，並非參考圖中原始模型的匯入。

## 操作

- 滑鼠按住角色或以單指抓住角色，移動超過 6 CSS px 後進入抓取。角色抬起、四肢與身體改成懸吊姿態；抓取期間停用場景旋轉。
- 放下位置限制在小島乾燥區，保留桌面與椅背的碰撞餘量。放下後停留 20 秒再恢復自主活動；開始新的番茄鐘階段會恢復相應行為。家具位置不變。
- 按一下角色觸發隨機動作或短句，連續兩次不抽到相同選項。短句由本地文案抽選，不呼叫 LLM；對話框約 5.5 秒消失。安靜模式只保留動作，專注時使用較輕的動作。
- 右下星球圖示開啟九位居民選單，選擇會儲存在本機。星球／迷你陪伴模式共用選擇；所有角色共用既有閱讀、休息與其他動作。
- 網頁迷你陪伴可在畫面內拖角色；Electron 桌寵抓取角色會透過受限 IPC 移動原有視窗，限制於螢幕工作區。不開啟新的跨程式存取權限。
- 背景拖動仍可旋轉星球；拖放不觸發點擊問候。取消手勢、失焦、切換場景時恢復鏡頭控制。

## 驗證證據

結果與限制完成測試後記錄於本文件後段。截圖與機器可讀結果位於 `artifacts/interaction`；`scripts/review-companions.mjs` 逐一啟動九種真實場景，檢查選中的模型及冠飾節點，再擷取畫面。

## 人工確認

- 角色對照圖的材質、輪廓與細節為主觀美術驗收：Needs Human Review。不能將自動化測試視為與原圖完全一致的證明。
- 真實 iOS / Android 觸感與效能：Needs Human Review。
- Windows 原生桌寵跨螢幕拖曳與透明合成：Needs Human Review。雲端 Linux 驗證不能代替 Windows 實機。

## 本輪結果（2026-11-24）

| 項目 | 結果 | 證據 |
|---|---|---|
| 型別、ESLint、正式建置、套件相容性 | Passed | npm run check；最後材質修正後再次 build / lint |
| 純邏輯／API／資產與儲存測試 | Passed | 31 項；unit-results.json |
| 桌面與窄螢幕的拖放、點擊、九角色選擇／重整／模式切換 | Passed | 6 項；interaction-results.json |
| 番茄鐘、鏡頭、對話、安靜模式、離線模式回歸 | Passed | 6 項；regression-web-results.json |
| 真正 CDP 觸控拖放、點擊、旋轉、縮放與聊天 | Passed | 3 種手機尺寸／方向、6 項；artifacts/mobile-results.json |
| 響應式版面、環境音與字型失敗後備 | Passed | 6 項；artifacts/layout/design-results.json |
| Electron 模式、狀態、角色切換、視窗移動 IPC 與退出 | Passed | 1 項；artifacts/electron-results.json |
| 九位居民的真實模型載入與冠飾節點 | Passed | 9 個前視渲染，visual-results.json 無程式／主控台錯誤 |
| 蘑菇帽接縫、星塵獸星點／眼睛 | Passed | 首輪比較圖發現帽蓋浮縫與粗星點；改成封閉蘑菇帽、細點 Shader 與金色眼睛，重新渲染檢查 |
| 凝膠質感、各角色輪廓與原概念圖的相似度 | Needs Human Review | nine-residents.png；沿用共同身體骨架，未宣稱與離線渲染完全一致 |
| 實機效能與 Windows 原生拖放 | Needs Human Review | 雲端軟體 WebGL／Linux 測試不能代替實機 |

共 **56 項測試通過、0 失敗**；機器可讀總報告為 artifacts/interaction/test-report.json。九角色獨立近照約 2.4–3.0 萬三角形，10–47 draw calls；不是實機 FPS 的保證。

Electron 移動測試使用真正 preload IPC 與 BrowserWindow，控制游標讀值以驗證視窗位置；瀏覽器與手機套件另驗證真正的 pointer／touch 事件。沒有將此測試宣稱為 Windows 實體滑鼠驗收。

畫面：nine-residents.png（九角色）、held-desktop.png／held-touch-*.png（抓取）、speech-desktop.png（對話框）、selection-*.png（選單）、mini-companion.png（網頁迷你陪伴）。可重跑 `node scripts/review-companions.mjs`，再以 `python3 scripts/compose-companions.py` 合成比較圖（需 Pillow）。本機開發網址使用 5173。

推送後仍須由 Render 完成部署；未取得正式網站網址，沒有將線上部署列為已驗證。
