/**
 * 資料檔清單：列出 JSON 檔並檢查每個檔案能否正確解析，點選以 planner.html?trip=<路徑> 開啟。
 *
 * 檔案來源 (依序嘗試)：
 * 1. 目錄列表：透過 HTTP 伺服器的目錄列表 (python http.server / tools/serve.py / Live Server) 取得 data-dir 下的檔名，
 *    卡片標題維持 HTML 原本的文字 (例如「Debug：data/ 檔案」)。
 * 2. 清單檔：目錄列表讀取失敗或沒有檔案時 (Vercel、GitHub Pages 等靜態託管、file://)，改讀 data-manifest 指定的清單檔
 *    (例如 samples.json)，卡片標題改為 data-manifest-title (預設「範例行程」)。
 *    清單格式：{ "samples": ["data/sample.json", { "path": "history/00-總年表.json", "title": "自訂標題" }] }
 * 3. 兩者都沒有檔案時隱藏整張卡片。
 *
 * #debug-data-list 的屬性：
 * - data-dir：要列出的目錄 (預設 data/)
 * - data-unit：detail 的計數單位 (預設「天」)
 * - data-manifest：目錄列表失敗時改用的清單檔 (省略則直接隱藏)
 * - data-manifest-title：使用清單檔時的卡片標題
 * 卡片標題元素為 #debug-card-title (可省略)。
 */

const DEBUG_DATA_DIR = 'data/';

/** 讀取 #debug-data-list 的設定，目錄統一以 / 結尾 */
function getDataListOptions() {
    const list = document.getElementById('debug-data-list');
    const data = (list && list.dataset) || {};
    const dir = data.dir || DEBUG_DATA_DIR;
    return {
        dir: dir.endsWith('/') ? dir : `${dir}/`,
        unit: data.unit || '天',
        manifest: data.manifest || '',
        manifestTitle: data.manifestTitle || '範例行程',
    };
}

/** 從目錄列表取得 JSON 檔；伺服器不提供目錄列表時拋出錯誤或回傳空陣列 */
async function fetchDataDirListing(dataDir) {
    const res = await fetch(dataDir, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // 以實際的目錄網址解析 href，因此 "x.json"、"/data/x.json"、完整網址都能處理
    const dirUrl = new URL(res.url || dataDir, window.location.href);
    const dirPath = dirUrl.pathname.endsWith('/') ? dirUrl.pathname : `${dirUrl.pathname}/`;

    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const names = Array.from(doc.querySelectorAll('a[href]'))
        .map(a => {
            try {
                return new URL(a.getAttribute('href'), dirUrl.origin + dirPath);
            } catch (e) {
                return null;
            }
        })
        .filter(url => url && url.origin === dirUrl.origin && url.pathname.startsWith(dirPath))
        .map(url => decodeURIComponent(url.pathname.slice(dirPath.length)))
        // 只取該目錄本身的檔案，不含子目錄
        .filter(name => name.toLowerCase().endsWith('.json') && !name.includes('/'));

    return Array.from(new Set(names)).sort().map(name => ({ path: dataDir + name, label: name, title: '' }));
}

/** 從清單檔取得檔案；每筆可寫路徑字串或 { path, title } */
async function fetchDataManifest(manifest) {
    const res = await fetch(manifest, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const entries = (await res.json()).samples || [];
    return entries
        .map(entry => (typeof entry === 'string' ? { path: entry, title: '' } : entry))
        .filter(entry => entry && typeof entry.path === 'string')
        .map(entry => ({ path: entry.path, label: entry.title || entry.path.split('/').pop(), title: entry.title || '' }));
}

async function checkDataFile(path, unit) {
    try {
        const res = await fetch(path.split('/').map(encodeURIComponent).join('/'), { cache: 'no-store' });
        if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };

        const text = await res.text();
        try {
            const data = JSON.parse(text);
            const days = data && data.detail ? Object.keys(data.detail).length : 0;
            const meta = (data && data.metadata) || {};
            return { ok: true, title: meta.title || '', subtitle: meta.subtitle || '', days: `${days} ${unit}` };
        } catch (parseError) {
            return { ok: false, message: describeJsonError(parseError, text) };
        }
    } catch (fetchError) {
        return { ok: false, message: fetchError.message || String(fetchError) };
    }
}

function createDebugFileItem(file) {
    const li = document.createElement('li');
    li.className = 'flex flex-col gap-0.5 p-2 rounded-lg border border-slate-100 hover:bg-slate-50';

    const url = `planner.html?trip=${encodeURIComponent(file.path)}`;
    li.innerHTML = `
        <div class="flex items-center gap-2">
            <span class="debug-status w-2 h-2 rounded-full bg-slate-300 shrink-0"></span>
            <a href="${escapeHtml(url)}" target="_blank" class="debug-label text-xs font-bold text-slate-700 hover:text-indigo-600 break-all">${escapeHtml(file.label)}</a>
        </div>
        <p class="debug-message text-[11px] text-slate-400 pl-4 break-all">檢查中...</p>`;
    return li;
}

/** 卡片是否顯示：有檔案 (不論來自目錄列表或清單檔) 就顯示，沒有時隱藏 */
function updateDataListVisibility() {
    const list = document.getElementById('debug-data-list');
    if (!list) return;
    const section = list.closest('section') || list;
    section.style.display = section.dataset.source ? '' : 'none';
}

/** 依來源切換卡片標題 (第一次呼叫時記下 HTML 原本的標題，作為目錄模式的標題) */
function updateDataListTitle(source, manifestTitle) {
    const titleEl = document.getElementById('debug-card-title');
    if (!titleEl) return;
    if (titleEl.dataset.dirTitle === undefined) titleEl.dataset.dirTitle = titleEl.textContent.trim();
    titleEl.textContent = source === 'manifest' ? manifestTitle : titleEl.dataset.dirTitle;
}

/** 先試目錄列表，失敗或沒有檔案時改用清單檔 */
async function resolveDataListFiles(options) {
    try {
        const files = await fetchDataDirListing(options.dir);
        if (files.length) return { source: 'dir', files };
        console.info(`[debug] ${options.dir} 沒有列出任何 JSON 檔`);
    } catch (error) {
        console.info(`[debug] 無法列出 ${options.dir} (${error.message})`);
    }
    if (!options.manifest) return { source: '', files: [] };
    try {
        const files = await fetchDataManifest(options.manifest);
        console.info(`[debug] 改用清單檔 ${options.manifest}：${files.length} 個檔案`);
        return { source: files.length ? 'manifest' : '', files };
    } catch (error) {
        console.info(`[debug] 無法讀取清單檔 ${options.manifest} (${error.message})`);
        return { source: '', files: [] };
    }
}

async function loadDebugDataList() {
    const list = document.getElementById('debug-data-list');
    const summary = document.getElementById('debug-data-summary');
    if (!list || !summary) return;

    const options = getDataListOptions();
    const section = list.closest('section') || list;
    list.innerHTML = '';
    summary.textContent = '讀取中...';

    const { source, files } = await resolveDataListFiles(options);
    section.dataset.source = source;
    updateDataListTitle(source, options.manifestTitle);
    updateDataListVisibility();
    if (!source) {
        console.info('[debug] 沒有可列出的檔案，隱藏卡片');
        return;
    }

    const items = files.map(file => {
        const li = createDebugFileItem(file);
        list.appendChild(li);
        return li;
    });

    const results = await Promise.all(files.map(file => checkDataFile(file.path, options.unit)));
    let failed = 0;
    results.forEach((result, i) => {
        const li = items[i];
        li.querySelector('.debug-status').className =
            `debug-status w-2 h-2 rounded-full shrink-0 ${result.ok ? 'bg-emerald-500' : 'bg-red-500'}`;
        const msg = li.querySelector('.debug-message');
        if (!result.ok) {
            msg.textContent = result.message;
        } else if (source === 'manifest') {
            // 範例以標題為主 (沒有自訂 title 時用 metadata.title)，第二行為天數 · 副標
            if (!files[i].title && result.title) li.querySelector('.debug-label').textContent = result.title;
            msg.textContent = [result.days, result.subtitle].filter(Boolean).join(' · ');
        } else {
            msg.textContent = [result.days, result.title].filter(Boolean).join(' · ');
        }
        msg.className = `debug-message text-[11px] pl-4 break-all ${result.ok ? 'text-slate-400' : 'text-red-600 font-medium'}`;
        if (!result.ok) failed++;
    });

    summary.textContent = failed
        ? `共 ${files.length} 個檔案，${failed} 個解析失敗`
        : `共 ${files.length} 個檔案，全部正常`;
}
