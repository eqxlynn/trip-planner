# Triplanner

純前端的旅遊行程規劃工具 (HTML + Tailwind CDN + Vanilla JS)，可直接以 `file://` 開啟。

## 頁面

| 頁面 | 說明 |
|---|---|
| `index.html` | 行程庫：本地匯入 / Google Drive 同步 / 新增 / 刪除 |
| `planner.html` | 行程檢視與編輯、預算表、列印小冊子 |
| `sheet.html` | 單張列印 (sheet)：每頁並排多天 (或多頁，例如總年表的臺灣／東亞／世界) |

`planner.html` 網址參數：

- `?trip_token=<Drive file ID>`：雲端行程
- `?trip_local=<檔名>`：本地 (localStorage) 行程
- `?trip=<檔名>.json`：開發測試用，讀取同目錄 JSON (需以 HTTP server 開啟)

`sheet.html` 網址參數 (設定列的選項也會同步寫回網址)：

- 資料：`trip_token` / `trip_local` / `trip` 同上
- 版面：`paper=A4|A3|B4|Letter`、`orient=landscape|portrait`、`margin` (mm)、`fs=auto|<pt>`、`cols` 每頁欄數、`days` 指定頁面 (逗號分隔)、`accent` 主色、`desc=0|1|2|3|all` 說明行數、`head` / `sub` / `tips` 顯示頁首、子行程與 Tips、`unit=year|century` 年份對齊單位 (同一年或同一世紀一列，世紀模式每列前有世紀標籤)、`gutter` 欄距 mm (預設 6，平分在摺線兩側；`margin` 只用於紙張外緣，欄寬固定為紙寬 1/N 以便平均摺頁)、`cover=1` 第一頁印封面 (標題與 `metadata.guides` 說明卡，說明全文列印)
- 項目加上 `"hide": [...]` 可在指定模式隱藏 (連同其子項目)：`"print"` 小冊子、`"sheet"` 單張列印 (sheet.html)、`"mirror"` 對照時間軸、`"all"` 以上全部 (只在 planner 網頁與編輯模式看得到)，例如 `"hide": ["print", "sheet"]`；網頁行程頁一律顯示。時間軸、子行程、Tips 與封面說明卡都適用 (取代舊的 `visible` / `dm` / `mirror` 欄位)
- 時間對齊：`align=off|1|2|3|4`，依各項目的 `time` 讓同一時間跨欄排在同一列。數字為對齊到第幾層 (較淺且有子項目的層當分組標題，多欄同名時合併成橫跨整頁的分期列)；有時刻 (08:10) 時以整點分列，否則以年份 (`year` 欄位或由 `time` 推算)；沒有時間的項目跟著上一個項目；縮到 8 pt 仍放不下時依列自動分頁，每頁重複欄位標題與進行中的分組
- JSON 的 `metadata.sheet` 可指定預設版面 (例如 `{"cols": 3, "paper": "A4"}`)，網址參數優先
- 非日期 key 可加排序前綴 `1.2_` (顯示時去掉)，例如 `2_東亞` 顯示為「東亞」

## 目錄結構

```
assets/                圖片素材 (svg / png)
docs/
  prompt.md            產生行程 JSON 用的 LLM prompt
css/
  index.css            行程庫頁樣式
  planner.css          行程頁樣式 (Tailwind @apply 元件仍在 planner.html 內)
  sheet.css            單張列印頁樣式
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
  sheet/               sheet.html 專用
    sheet.js           單張列印 (sheet)、自動字級
```

所有檔案以一般 `<script>` 依序載入 (非 ES Modules)，載入順序見各 HTML。

## 行程 JSON 格式

見 [`docs/prompt.md`](docs/prompt.md)（產生行程 JSON 用的 LLM prompt）。
