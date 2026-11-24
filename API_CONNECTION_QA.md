# 介面精簡與 API 連線判讀

- 刪除選角面板「旋轉檢視角色模型」連結及打招呼／抓取提示。
- 暫時隱藏主畫面的迷你陪伴／切換桌寵入口；保留桌寵程式供後續恢復。
- 健康檢查讀到 Key 時只顯示「AI 已設定，待測試」，真正 `/api/chat` 回傳 provider=llm 才顯示「AI 已連線」。
- 上游失敗僅記錄固定代碼，不記錄 Key、訊息或上游回應本文。成功記錄 `[LLM] reply_ok`。HTTP 失敗記錄 `[LLM] provider_http_<status>`，其他為 timeout、invalid_json 或 request_or_response_failed。

## Render 檢查方式

1. Environment 設定 `LLM_API_KEY`、`LLM_BASE_URL=https://api.groq.com/openai/v1`、`LLM_MODEL=llama-3.3-70b-versatile`，儲存並重新部署。
2. 開啟 `/api/health`：provider=mock 表示沒有讀到 Key；provider=llm 只表示 Key 已設定，不保證有效。
3. 在網站送出一句普通訊息，檢查標籤及 Logs 的 `[LLM]`。401=金鑰驗證失敗、403=權限拒絕、404=模型／路徑未找到、429=額度或頻率限制、400=請求或模型參數不接受；timeout=上游逾時。實際原因仍應對照 Groq 控制台。
4. `.env not found` 可忽略：Render Environment 注入的變數不需要 `.env` 檔案。

## 驗證

`scripts/check-ui-api-status.mjs` 在桌面與觸控手機確認移除提示、隱藏入口，以及設定待測試→備援／成功的狀態轉換。此測試使用模擬 HTTP 回覆，不是實際 Groq Key 驗證。新增單元測試確認 401 回退且 log 不含憑證／上游本文。證據位於 artifacts/ui-api-status。

嘗試從雲端查詢正式 `/api/health`，出站代理回覆 CONNECT 403，無法驗證遠端 API 狀態；未讀取或要求使用者金鑰。

最終 `npm run check` 通過：44 項測試、型別、lint、正式建置及依賴檢查；桌機與手機 UI 狀態測試均通過。
