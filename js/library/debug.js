/**
 * Debug 工具：列出指定目錄下的 JSON 檔，並檢查每個檔案能否正確解析。
 *
 * 透過 HTTP 伺服器的目錄列表 (python http.server / tools/serve.py) 取得檔名，
 * 以 file:// 開啟或伺服器不提供目錄列表時會顯示提示訊息。
 *
 * 目錄預設為 data/，可在 #debug-data-list 加上 data-dir 指定其他目錄
 * (例如 <ul id="debug-data-list" data-dir="data/history/">)；
 * data-unit 可指定 detail 的計數單位 (預設「天」)。
 */

const DEBUG_DATA_DIR = 'data/';

/** 讀取 #debug-data-list 的 data-dir，統一以 / 結尾 */
function getDebugDataDir() {
    const list = document.getElementById('debug-data-list');
    const dir = (list && list.dataset.dir) || DEBUG_DATA_DIR;
    return dir.endsWith('/') ? dir : `${dir}/`;
}

function getDebugDataUnit() {
    const list = document.getElementById('debug-data-list');
    return (list && list.dataset.unit) || '天';
}

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

    return Array.from(new Set(names)).sort();
}

async function checkDataFile(dataDir, name, unit) {
    try {
        const res = await fetch(dataDir + encodeURIComponent(name), { cache: 'no-store' });
        if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };

        const text = await res.text();
        try {
            const data = JSON.parse(text);
            const days = data && data.detail ? Object.keys(data.detail).length : 0;
            const title = data && data.metadata && data.metadata.title ? data.metadata.title : '';
            return { ok: true, message: `${days} ${unit}${title ? ' · ' + title : ''}` };
        } catch (parseError) {
            return { ok: false, message: describeJsonError(parseError, text) };
        }
    } catch (fetchError) {
        return { ok: false, message: fetchError.message || String(fetchError) };
    }
}

function createDebugFileItem(dataDir, name) {
    const li = document.createElement('li');
    li.className = 'flex flex-col gap-0.5 p-2 rounded-lg border border-slate-100 hover:bg-slate-50';

    const url = `planner.html?trip=${encodeURIComponent(dataDir + name)}`;
    li.innerHTML = `
        <div class="flex items-center gap-2">
            <span class="debug-status w-2 h-2 rounded-full bg-slate-300 shrink-0"></span>
            <a href="${escapeHtml(url)}" target="_blank" class="text-xs font-bold text-slate-700 hover:text-indigo-600 break-all">${escapeHtml(name)}</a>
        </div>
        <p class="debug-message text-[11px] text-slate-400 pl-4 break-all">檢查中...</p>`;
    return li;
}

async function loadDebugDataList() {
    const list = document.getElementById('debug-data-list');
    const summary = document.getElementById('debug-data-summary');
    if (!list || !summary) return;

    const dataDir = getDebugDataDir();
    const unit = getDebugDataUnit();
    list.innerHTML = '';
    summary.textContent = '讀取中...';

    let names;
    try {
        names = await fetchDataDirListing(dataDir);
    } catch (error) {
        console.warn(`[debug] 無法列出 ${dataDir}：`, error);
        summary.textContent = `無法列出 ${dataDir} (需透過 HTTP 伺服器開啟，例如 python3 tools/serve.py)`;
        return;
    }

    if (names.length === 0) {
        summary.textContent = `${dataDir} 下找不到 JSON 檔 (或伺服器回傳的不是目錄列表，建議用 python3 tools/serve.py)`;
        return;
    }

    const items = names.map(name => {
        const li = createDebugFileItem(dataDir, name);
        list.appendChild(li);
        return li;
    });

    const results = await Promise.all(names.map(name => checkDataFile(dataDir, name, unit)));
    let failed = 0;
    results.forEach((result, i) => {
        const li = items[i];
        li.querySelector('.debug-status').className =
            `debug-status w-2 h-2 rounded-full shrink-0 ${result.ok ? 'bg-emerald-500' : 'bg-red-500'}`;
        const msg = li.querySelector('.debug-message');
        msg.textContent = result.message;
        msg.className = `debug-message text-[11px] pl-4 break-all ${result.ok ? 'text-slate-400' : 'text-red-600 font-medium'}`;
        if (!result.ok) failed++;
    });

    summary.textContent = failed
        ? `共 ${names.length} 個檔案，${failed} 個解析失敗`
        : `共 ${names.length} 個檔案，全部正常`;
}
