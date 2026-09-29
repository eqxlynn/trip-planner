/**
 * 行程庫：總表 (trip_list.json / local_trip_list) 的讀寫、雲端同步與列表渲染。
 *
 * 總表格式：{ trips: [{ id, name }] }
 * - 雲端模式：id 為 Drive file ID
 * - 本地模式：id 為匯入時的檔名
 */

const libraryState = {
    accessToken: null,
    isEditMode: false,
    masterListId: localStorage.getItem(STORAGE_KEYS.MASTER_LIST_ID) || STORAGE_KEYS.LOCAL_LIST,
    tripMasterData: { trips: [] },
};

function normalizeMasterData(data) {
    return data && Array.isArray(data.trips) ? data : { trips: [] };
}

function isCloudMode() {
    return !!(libraryState.accessToken || AuthSession.getValidToken());
}

/** 雲端總表是否已完成定位 (尚未同步前 masterListId 可能還是本地 key) */
function hasCloudMasterList() {
    return !!libraryState.masterListId && libraryState.masterListId !== STORAGE_KEYS.LOCAL_LIST;
}

// ------------------------------------------
// 讀取與渲染
// ------------------------------------------

/** 從本地快取載入總表並渲染 (雲端模式讀雲端總表快取，否則讀本地清單) */
function loadTripList() {
    const isCloud = isCloudMode();
    const listKey = isCloud ? localStorage.getItem(STORAGE_KEYS.MASTER_LIST_ID) : STORAGE_KEYS.LOCAL_LIST;
    libraryState.tripMasterData = normalizeMasterData(TripStorage.getJson(listKey));
    renderTripList(libraryState.tripMasterData, isCloud);
}

function renderTripList(masterData, isCloud) {
    const listDiv = document.getElementById('trip-list');
    listDiv.innerHTML = '';

    const trips = normalizeMasterData(masterData).trips;
    if (trips.length === 0) {
        listDiv.innerHTML = `
            <div class="h-32 flex flex-col items-center justify-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                <i data-lucide="${isCloud ? 'cloud' : 'inbox'}" class="w-8 h-8 mb-2 opacity-50"></i>
                <p class="text-sm">${isCloud ? '雲端無行程' : '尚未匯入任何行程'}</p>
            </div>`;
        refreshIcons(listDiv);
        return;
    }

    const { isEditMode } = libraryState;
    trips.forEach(trip => listDiv.appendChild(createTripListItem(trip, isCloud, isEditMode)));
    refreshIcons(listDiv);
}

function createTripListItem(trip, isCloud, isEditMode) {
    const fileId = trip.id;
    const baseName = trip.name || '未命名行程';

    // 以 fileId 從快取讀取 metadata 作為顯示標題
    const cached = TripStorage.getJson(fileId);
    const displayTitle = cached?.metadata?.title || baseName;
    const displaySubtitle = cached?.metadata?.subtitle || '';

    const item = document.createElement('div');
    item.className = `group flex items-center justify-between p-4 bg-white rounded-xl border transition-all duration-200 ${isEditMode ? 'border-red-200 shadow-sm' : 'border-slate-100 hover:border-indigo-200 hover:shadow-md cursor-pointer'}`;

    item.innerHTML = `
        <div class="min-w-0 flex-grow pr-4" data-role="open">
            <div class="flex items-center">
                <p class="font-bold text-slate-800 text-base truncate group-hover:text-indigo-700 transition-colors">${escapeHtml(displayTitle)}</p>
                ${isCloud ? `<i data-lucide="cloud" class="w-4 h-4 text-blue-500 ml-2 shrink-0" title="雲端檔案"></i>` : ''}
            </div>
            ${displaySubtitle ? `<p class="text-xs text-slate-500 truncate mt-1.5 flex items-center gap-1"><i data-lucide="info" class="w-3 h-3 shrink-0"></i>${escapeHtml(displaySubtitle)}</p>` : ''}
        </div>
        ${isEditMode
            ? `<button data-role="delete" class="text-red-500 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100 w-9 h-9 flex items-center justify-center rounded-lg transition-colors shrink-0"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`
            : `<i data-lucide="chevron-right" class="w-5 h-5 text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0"></i>`
        }
    `;

    if (isEditMode) {
        item.querySelector('[data-role="delete"]').addEventListener('click', () => deleteTrip(fileId, displayTitle));
    } else {
        item.querySelector('[data-role="open"]').addEventListener('click', () => openTrip(fileId));
    }
    return item;
}

// ------------------------------------------
// 雲端總表同步
// ------------------------------------------

/** 定位雲端總表、同步所有行程快取，並清除雲端已刪除的行程 */
async function initCloudTripList() {
    const token = libraryState.accessToken;
    if (!token) return;

    try {
        setStatus('loading', '檢查雲端索引中...');

        // 1. 以檔名找到總表的 file ID
        const searchRes = await gapi.client.drive.files.list({
            q: `name='${APP_CONFIG.MASTER_LIST_FILENAME}' and trashed=false`,
            fields: 'files(id)',
        });
        const files = searchRes.result.files || [];

        if (files.length === 0) {
            // 雲端尚無總表：建立一份空的
            libraryState.tripMasterData = { trips: [] };
            await saveMasterListToCloud(true);
        } else {
            libraryState.masterListId = files[0].id;
            localStorage.setItem(STORAGE_KEYS.MASTER_LIST_ID, libraryState.masterListId);

            // 2. 取得總表最新內容
            libraryState.tripMasterData = normalizeMasterData(await validateAndFetch(libraryState.masterListId, token));

            // 3. 平行同步每個行程，只移除「確定已刪除」的項目 (暫時性錯誤不移除)
            const trips = libraryState.tripMasterData.trips;
            if (trips.length > 0) {
                setStatus('loading', '同步個別行程中...');
                const results = await Promise.all(
                    trips.map(async trip => ({ id: trip.id, status: (await syncDriveFile(trip.id, token)).status }))
                );
                const deletedIds = results.filter(r => r.status === 'deleted').map(r => r.id);

                if (deletedIds.length > 0) {
                    console.log(`發現 ${deletedIds.length} 個已失效的雲端行程，正在從總表中移除...`, deletedIds);
                    libraryState.tripMasterData.trips = trips.filter(trip => !deletedIds.includes(trip.id));
                    setStatus('loading', '清理無效索引中...');
                    await saveMasterListToCloud();
                }
            }
        }

        setStatus('success', '同步完成');
        renderTripList(libraryState.tripMasterData, true);
    } catch (error) {
        console.error('初始化中央索引檔失敗：', error);
        if (error.message === ERROR_TOKEN_EXPIRED) handleLogout();
        setStatus('error', '索引同步失敗');
    }
}

/** 將 libraryState.tripMasterData 寫回雲端總表並更新本地快取 */
async function saveMasterListToCloud(isNew = false) {
    if (!libraryState.accessToken) return;
    if (!isNew && !hasCloudMasterList()) return;

    const result = await uploadDriveJson({
        fileId: isNew ? null : libraryState.masterListId,
        name: APP_CONFIG.MASTER_LIST_FILENAME,
        content: JSON.stringify(libraryState.tripMasterData),
        fields: 'id, modifiedTime',
    });

    if (isNew) {
        libraryState.masterListId = result.id;
        localStorage.setItem(STORAGE_KEYS.MASTER_LIST_ID, result.id);
    }

    TripStorage.setJson(libraryState.masterListId, libraryState.tripMasterData);
    TripStorage.setModifiedTime(libraryState.masterListId, result.modifiedTime);
}

/**
 * 在雲端總表新增或移除一筆行程。
 * @param {'add'|'remove'} action
 */
async function updateTripListInCloud(action, fileId, fileName = '') {
    if (!libraryState.accessToken || !hasCloudMasterList()) return;

    try {
        // 先取得最新總表，避免覆蓋其他裝置的變更
        const latest = await validateAndFetch(libraryState.masterListId, libraryState.accessToken);
        const masterData = normalizeMasterData(latest);

        if (action === 'add') {
            if (!masterData.trips.some(trip => trip.id === fileId)) {
                masterData.trips.push({ id: fileId, name: fileName });
            }
        } else if (action === 'remove') {
            masterData.trips = masterData.trips.filter(trip => trip.id !== fileId);
        }

        libraryState.tripMasterData = masterData;
        await saveMasterListToCloud();
        renderTripList(masterData, true);
    } catch (error) {
        console.error('更新 trip_list.json 失敗', error);
    }
}

/** 新增或覆蓋 (依檔名比對) 雲端上的行程檔，回傳 Drive file ID */
async function createOrUpdateTripFile(fileContent, fileName) {
    if (!libraryState.accessToken) return null;

    const existingTrip = libraryState.tripMasterData.trips.find(t => t.name === fileName);
    const result = await uploadDriveJson({
        fileId: existingTrip ? existingTrip.id : null,
        name: fileName,
        content: fileContent,
    });
    return result.id;
}

// ------------------------------------------
// 本地總表
// ------------------------------------------

function addToLocalTripList(fileId, fileName) {
    const trips = libraryState.tripMasterData.trips;
    if (!trips.some(t => t.id === fileId)) {
        trips.push({ id: fileId, name: fileName });
        TripStorage.setJson(STORAGE_KEYS.LOCAL_LIST, libraryState.tripMasterData);
    }
}

function removeFromLocalTripList(fileId) {
    libraryState.tripMasterData.trips = libraryState.tripMasterData.trips.filter(t => t.id !== fileId);
    TripStorage.setJson(STORAGE_KEYS.LOCAL_LIST, libraryState.tripMasterData);
}

// ------------------------------------------
// 開啟、刪除、管理模式
// ------------------------------------------

function buildPlannerUrl(fileId, isCloud) {
    const param = isCloud ? 'trip_token' : 'trip_local';
    return `planner.html?${param}=${encodeURIComponent(fileId)}`;
}

/** 在新分頁開啟行程 (雲端資料的同步由 planner 頁面負責) */
function openTrip(fileId) {
    if (!fileId || fileId === 'null') return;
    window.open(buildPlannerUrl(fileId, !!libraryState.accessToken), '_blank');
}

async function deleteTrip(fileId, title) {
    if (!confirm(`確定從系統中刪除行程「${title}」？\n此操作會將雲端檔案移至垃圾桶 (若有連結雲端)。`)) return;

    if (libraryState.accessToken && fileId && fileId !== 'null') {
        setStatus('loading', '刪除雲端檔案中...');
        try {
            await updateTripListInCloud('remove', fileId);
        } catch (error) {
            console.error('雲端刪除失敗', error);
        }
    } else {
        removeFromLocalTripList(fileId);
    }

    TripStorage.remove(fileId);
    setStatus('success', '刪除成功');
    loadTripList();
}

function toggleEditMode() {
    libraryState.isEditMode = !libraryState.isEditMode;
    const on = libraryState.isEditMode;
    const btn = document.getElementById('edit-toggle');

    btn.classList.replace(on ? 'bg-slate-50' : 'bg-red-50', on ? 'bg-red-50' : 'bg-slate-50');
    btn.classList.replace(on ? 'text-slate-500' : 'text-red-600', on ? 'text-red-600' : 'text-slate-500');
    btn.classList.replace(on ? 'border-slate-200' : 'border-red-200', on ? 'border-red-200' : 'border-slate-200');
    btn.innerHTML = `<i data-lucide="${on ? 'check' : 'settings-2'}" class="w-3.5 h-3.5"></i><span id="edit-toggle-txt">${on ? '完成編輯' : '管理模式'}</span>`;
    refreshIcons(btn);

    loadTripList();
}
