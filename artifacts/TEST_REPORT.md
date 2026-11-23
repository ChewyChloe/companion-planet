# 最終測試摘要

日期：2026-11-23。詳細限制見 DEVELOPMENT_REPORT.md。

| 檢查 | 通過 | 失敗 | 跳過 |
|---|---:|---:|---:|
| TypeScript / ESLint / build / npm ls | 通過 | 0 | 0 |
| Vitest（4 個檔案） | 19 | 0 | 0 |
| Web E2E | 6 | 0 | 0 |
| Electron 整合（Linux Xvfb） | 1 | 0 | 0 |

Web：1366×768、390×844。實際控制鏡頭、點擊 3D 角色、比對動畫姿態變化，操作番茄鐘與對話。日期前移驗證截止，另有真實 10 秒展示。

Electron：production build、透明配置、置頂、動畫持續、計時保留、隱藏恢復、返回與退出；不是 Windows 原生實機測試。

原始 runner 結果：web-results.json、electron-results.json。完整檢查輸出：final-check.log；重新安裝輸出：install-validation.log。

Windows NSIS：缺 Wine 而未完成；可攜 ZIP 建置另記於 package-verification.json。真實 LLM API、Windows 安裝／合成／拖曳、GPU 效能均未驗證。
