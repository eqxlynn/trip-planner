# Triplanner

純前端的旅遊行程規劃工具 (HTML + Tailwind CDN + Vanilla JS)，可直接以 `file://` 開啟。

## 頁面

| 頁面 | 說明 |
|---|---|
| `index.html` | 行程庫：本地匯入 / Google Drive 同步 / 新增 / 刪除 |
| `planner.html` | 行程檢視與編輯、預算表、列印小冊子 |

`planner.html` 網址參數：

- `?trip_token=<Drive file ID>`：雲端行程
- `?trip_local=<檔名>`：本地 (localStorage) 行程
- `?trip=<檔名>.json`：開發測試用，讀取同目錄 JSON (需以 HTTP server 開啟)

## 目錄結構

```
assets/                圖片素材 (svg / png)
docs/
  prompt.md            產生行程 JSON 用的 LLM prompt
css/
  index.css            行程庫頁樣式
  planner.css          行程頁樣式 (Tailwind @apply 元件仍在 planner.html 內)
js/
  core/                兩頁共用
    config.js          API 憑證、storage key
    dom.js             escapeHtml、refreshIcons、toggleDisplay、setStatus
    date.js            YYYY-MM-DD 日期工具
    storage.js         TripStorage (localStorage)、AuthSession (sessionStorage)
    markdown.js        Markdown → HTML
    drive.js           Drive 同步 / 下載 / 上傳
  theme.js             主題與事件類別 (TYPE_CONFIG)
  library/             index.html 專用
    trip-list.js       總表讀寫、雲端同步、列表渲染
    auth.js            Google 登入 / 登出 / Picker
    main.js            進入點、匯入、新增行程
  planner/             planner.html 專用
    components.js      共用 HTML 片段 (時間軸、卡片、日曆 Icon)
    view.js            頁面渲染、切換天數
    editor.js          編輯模式、欄位寫回
    budget.js          預算統計
    print.js           列印小冊子
    export.js          匯出 JSON
    app.js             進入點、資料來源判斷
```

所有檔案以一般 `<script>` 依序載入 (非 ES Modules)，載入順序見各 HTML。

## 行程 JSON 格式

見 [`docs/prompt.md`](docs/prompt.md)（產生行程 JSON 用的 LLM prompt）。
