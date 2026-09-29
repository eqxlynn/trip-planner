/**
 * 行程頁面進入點：依網址參數決定資料來源、載入資料、綁定事件。
 *
 * 網址參數：
 * - trip_token：雲端模式，值為 Drive file ID
 * - trip_local：本地模式，值為 localStorage key (匯入時的檔名)
 * - trip：開發測試模式，值為同目錄下的 .json 檔 (需以 HTTP server 開啟)
 */

const urlParams = new URLSearchParams(window.location.search);
const tripSource = {
    token: urlParams.get('trip_token'),
    local: urlParams.get('trip_local'),
    rawFile: urlParams.get('trip'),
};

/** 目前行程在 localStorage 中的 key */
function getTripStorageKey() {
    if (tripSource.token) return tripSource.token;
    if (tripSource.local) return tripSource.local;
    if (tripSource.rawFile) return `trip_${tripSource.rawFile}`;
    return null;
}

/**
 * 讀取並解析 JSON 檔。
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 *   error 為 { message } 或 locateJsonError() 的結果 (含行號與欄號)
 */
async function loadTripFile(url) {
    let text;
    try {
        // 開發模式常直接修改 JSON，略過瀏覽器快取以取得最新內容
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) return { data: null, error: { message: `HTTP ${response.status}` } };
        text = await response.text();
    } catch (e) {
        console.error(e);
        return { data: null, error: { message: e.message || String(e) } };
    }

    try {
        return { data: JSON.parse(text), error: null };
    } catch (e) {
        console.error(e);
        return { data: null, error: locateJsonError(e, text) };
    }
}

/** 雲端模式：同步 Drive 最新版本，失敗時退回本地快取 */
async function fetchCloudTripData(fileId) {
    const cached = TripStorage.getJson(fileId);
    const accessToken = AuthSession.getValidToken();
    if (!accessToken) {
        alert('找不到登入憑證，請回到首頁重新登入！');
        return cached;
    }

    try {
        return await validateAndFetch(fileId, accessToken);
    } catch (error) {
        if (error.message === ERROR_TOKEN_EXPIRED) {
            alert('您的工作階段已過期，請重新登入！');
        }
        return cached;
    }
}

function showTrip(data, cacheKey) {
    window.tripData = data;
    if (cacheKey) TripStorage.setJson(cacheKey, data);
    render();
}

async function startApp() {
    if (tripSource.token) {
        const data = await fetchCloudTripData(tripSource.token);
        if (data) showTrip(data, tripSource.token);
        else loadFail(tripSource.token);
        return;
    }

    if (tripSource.local) {
        const data = TripStorage.getJson(tripSource.local);
        if (data) {
            showTrip(data);
        } else {
            alert('無法解析或找不到行程資料！');
            loadFail(tripSource.local);
        }
        return;
    }

    if (tripSource.rawFile) {
        const file = tripSource.rawFile;
        const isAllowed = file.endsWith('.json') && !file.startsWith('http');
        if (!isAllowed) {
            loadFail(file);
            return;
        }
        const { data, error } = await loadTripFile(file);
        if (data) showTrip(data, `trip_${file}`);
        else loadFail(file, error);
        return;
    }

    alert('無效的行程參數！');
    window.location.href = 'index.html';
}

/** 儲存按鈕：寫入 localStorage、離開編輯模式並重新渲染 */
function handleSave() {
    // 讓正在編輯的欄位失焦，確保最後的輸入已寫回 tripData
    const active = document.activeElement;
    if (active && active.classList.contains('editable-element')) active.blur();

    const key = getTripStorageKey();
    if (key && window.tripData) TripStorage.setJson(key, window.tripData);

    if (plannerState.isEditMode) exitEditMode();
    render();

    const statusTxt = document.getElementById('data-status-txt');
    if (statusTxt) {
        const time = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
        statusTxt.textContent = `已儲存至本機 (${time})`;
    }
}

function bindPlannerEvents() {
    const on = (id, event, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
    };

    on('btn-toggle-edit', 'click', toggleEditMode);
    on('btn-print', 'click', () => window.print());
    on('btn-save', 'click', handleSave);
    on('btn-add-guide', 'click', addGuideItem);
    on('btn-add-day', 'click', addDayItem);
    on('btn-add-timeline', 'click', addTimelineItem);
    on('btn-add-tip', 'click', addTipItem);
    on('btn-delete-day', 'click', deleteActiveDay);
    on('detail-calendar-icon-container', 'click', openDayDatePicker);
    on('detail-date-input', 'change', handleDayDateInputChange);

    // 可編輯欄位與 type 下拉選單以事件委派處理 (元素會隨渲染重建)
    document.addEventListener('focusin', handleEditableFocusIn);
    document.addEventListener('focusout', handleEditableFocusOut);
    document.addEventListener('change', handleTypeSelectChange);
    document.addEventListener('click', handleDeleteClick);

    // 未儲存變更保護與儲存快捷鍵
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('keydown', handleSaveShortcut);

    setupExportFeature({
        buttonId: 'btn-export-json',
        getDataCallback: () => window.tripData,
        defaultFileName: tripSource.local,
    });
}

// script 位於 </body> 前，DOM 已就緒
bindPlannerEvents();
startApp();
