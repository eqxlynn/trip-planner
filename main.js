// ==========================================
// 🚀 1. Google Drive API 與全域變數設定
// ==========================================
const CLIENT_ID = '972073752246-i2ojn6e5naofgjutee4kibok3hvkar1e.apps.googleusercontent.com'; 
const APP_ID = '972073752246'; 
const API_KEY = 'AIzaSyDiTnwwxr4VTyJNDrziYEJ59Tg187zVYc4'; 

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient;
let accessToken = null;
let isEditMode = false;

let masterListId = localStorage.getItem('trip_list_id') || null; 
let tripMasterData = JSON.parse(localStorage.getItem('trip_list_data') || '{"trips":[]}');

window.onload = () => {
    renderTripList(); 
    lucide.createIcons();
};

function checkLoginState() {
    const savedToken = sessionStorage.getItem('gapi_token');
    const expireTime = sessionStorage.getItem('gapi_token_expire');

    if (savedToken && expireTime) {
        if (Date.now() < parseInt(expireTime)) {
            gapi.client.setToken({ access_token: savedToken });
            console.log("🔄 從暫存恢復登入狀態成功！");
            return true;
        } else {
            console.warn("⚠️ Token 已過期，請重新登入");
            sessionStorage.removeItem('gapi_token');
            sessionStorage.removeItem('gapi_token_expire');
        }
    }
    return false;
}

function gapiLoaded() {
    gapi.load('client:picker', {
        callback: async () => {
            try {
                await gapi.client.init({
                    apiKey: API_KEY,
                    discoveryDocs: [DISCOVERY_DOC],
                });
                console.log('gapi client 核心初始化成功');
                
                if (window.google && google.picker) {
                    console.log('🎉 Google Picker API 100% 準備就緒！');
                }

                if (checkLoginState()) {
                    accessToken = sessionStorage.getItem('gapi_token'); 
                    updateUIAfterLogin();
                    initMasterTripList(); 
                }
            } catch (error) {
                console.error('gapi 初始化失敗:', error);
            }
        },
        onerror: () => console.error('GAPI 載入發生錯誤或被瀏覽器封鎖'),
        timeout: 5000, 
        ontimeout: () => console.error('GAPI 載入超時 (5秒)') 
    });
}

window.gisLoaded = function() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
            if (tokenResponse.error !== undefined) {
                throw (tokenResponse);
            }
            
            accessToken = tokenResponse.access_token;
            const expireTime = Date.now() + (tokenResponse.expires_in * 1000); 
            sessionStorage.setItem('gapi_token', accessToken);
            sessionStorage.setItem('gapi_token_expire', expireTime);
            console.log("✅ 登入成功，Token 已暫存！");
            
            updateUIAfterLogin();
            initMasterTripList(); 
        },
    });

    document.getElementById('auth-btn').onclick = () => {
        if (!accessToken) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            initMasterTripList(); 
        }
    };
}; 

function updateUIAfterLogin() {
    document.getElementById('status-text').innerHTML = '<span class="text-emerald-600 flex items-center justify-center gap-1"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> 已連結雲端</span>';
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    document.getElementById('auth-btn-text').textContent = "🔄 重新整理雲端清單";
    document.getElementById('library-title').textContent = "雲端與本地行程庫"; 
    document.getElementById('import-login-prompt').classList.add('hidden');
    document.getElementById('picker-btn').classList.remove('hidden');
    lucide.createIcons();
}

// ==========================================
// 📂 2. 中央索引檔 (trip_list.json) 核心引擎
// ==========================================

async function initMasterTripList() {
    if (!accessToken) return;

    try {
        document.getElementById('status-text').innerHTML = '<span class="text-blue-500 flex items-center justify-center gap-1"><i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> 檢查雲端索引中...</span>';
        
        if (!masterListId) {
            const searchRes = await gapi.client.drive.files.list({
                q: "name='trip_list.json' and trashed=false",
                fields: 'files(id)'
            });
            
            if (searchRes.result.files && searchRes.result.files.length > 0) {
                masterListId = searchRes.result.files[0].id;
                localStorage.setItem('trip_list_id', masterListId);
            } else {
                await saveMasterListToCloud(true);
                return;
            }
        }

        const metaRes = await gapi.client.drive.files.get({
            fileId: masterListId,
            fields: 'modifiedTime'
        });
        
        const cloudModifiedTime = metaRes.result.modifiedTime;
        const localModifiedTime = localStorage.getItem('trip_list_modifiedTime');

        if (cloudModifiedTime !== localModifiedTime) {
            console.log("網頁載入：發現雲端資料較新，正在下載...");
            const contentRes = await gapi.client.drive.files.get({
                fileId: masterListId,
                alt: 'media'
            });
            
            tripMasterData = contentRes.result || { trips: [] };
            localStorage.setItem('trip_list_data', JSON.stringify(tripMasterData));
            localStorage.setItem('trip_list_modifiedTime', cloudModifiedTime);
        }

        await validateAndFetchTrips();

    } catch (error) {
        console.error("初始化中央索引檔失敗：", error);
        document.getElementById('status-text').innerHTML = '<span class="text-red-500 flex items-center justify-center gap-1"><i data-lucide="alert-circle" class="w-3.5 h-3.5"></i> 索引同步失敗</span>';
    }
}

async function validateAndFetchTrips() {
    let validTrips = [];
    let needsUpdate = false;

    for (const trip of tripMasterData.trips) {
        try {
            const res = await gapi.client.drive.files.get({
                fileId: trip.id,
                fields: 'id, name, trashed'
            });
            
            if (!res.result.trashed) {
                let currentTrip = { id: trip.id, name: trip.name };
                if (res.result.name !== trip.name) {
                    currentTrip.name = res.result.name;
                    needsUpdate = true;
                }
                validTrips.push(currentTrip);
            } else {
                needsUpdate = true; 
            }
        } catch (err) {
            needsUpdate = true;
        }
    }

    tripMasterData.trips = validTrips;

    if (needsUpdate) {
        await saveMasterListToCloud(); 
    }
    
    // 🌟 驗證完索引後，立刻下載實體檔案內容快取到本地
    await syncCloudTripsToLocal();
    
    renderTripList();
    document.getElementById('status-text').innerHTML = '<span class="text-emerald-600 flex items-center justify-center gap-1"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> 雲端同步完成</span>';
    lucide.createIcons();
}

// 🌟 新增：批次下載雲端檔案到本地 localStorage
async function syncCloudTripsToLocal() {
    if (!accessToken || !tripMasterData.trips.length) return;
    
    document.getElementById('status-text').innerHTML = '<span class="text-blue-500 flex items-center justify-center gap-1"><i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> 下載並同步行程中...</span>';
    lucide.createIcons();

    let library = JSON.parse(localStorage.getItem('trip_library') || '{}');
    let needsSave = false;

    const downloadPromises = tripMasterData.trips.map(async (trip) => {
        const baseName = trip.name.replace('.json', '');
        try {
            const res = await fetch(`https://www.googleapis.com/drive/v3/files/${trip.id}?alt=media`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (res.ok) {
                const tripData = await res.json();
                library[baseName] = tripData; 
                needsSave = true;
            }
        } catch (err) {
            console.error(`下載 ${trip.name} 失敗:`, err);
        }
    });

    await Promise.all(downloadPromises);

    if (needsSave) {
        localStorage.setItem('trip_library', JSON.stringify(library));
    }
}

// 🌟 移除 title 與 subtitle 參數，回歸純粹的索引記錄
async function updateTripListInCloud(action, fileId, fileName = "") {
    if (!masterListId || !accessToken) return;

    try {
        const metaRes = await gapi.client.drive.files.get({
            fileId: masterListId,
            fields: 'modifiedTime'
        });
        const cloudTime = metaRes.result.modifiedTime;
        const localTime = localStorage.getItem('trip_list_modifiedTime');

        if (cloudTime !== localTime) {
            const contentRes = await gapi.client.drive.files.get({
                fileId: masterListId,
                alt: 'media'
            });
            tripMasterData = contentRes.result || { trips: [] };
        }

        if (action === 'add') {
            const existingIndex = tripMasterData.trips.findIndex(trip => trip.id === fileId);
            if (existingIndex === -1) {
                tripMasterData.trips.push({ id: fileId, name: fileName });
            } 
        } else if (action === 'remove') {
            tripMasterData.trips = tripMasterData.trips.filter(trip => trip.id !== fileId);
        }

        await saveMasterListToCloud();
        renderTripList();
    } catch (error) {
        console.error("更新 trip_list.json 失敗", error);
    }
}

async function saveMasterListToCloud(isNew = false) {
    if (!accessToken) return;
    
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";
    
    const metadata = { name: 'trip_list.json', mimeType: 'application/json' };
    const fileContent = JSON.stringify(tripMasterData);
    
    const multipartRequestBody =
        delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) +
        delimiter + 'Content-Type: application/json\r\n\r\n' + fileContent +
        close_delim;

    let path = isNew ? '/upload/drive/v3/files' : `/upload/drive/v3/files/${masterListId}`;
    let method = isNew ? 'POST' : 'PATCH';

    const uploadRes = await gapi.client.request({
        path: path,
        method: method,
        params: { uploadType: 'multipart', fields: 'id, modifiedTime' }, 
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body: multipartRequestBody
    });

    if (isNew) {
        masterListId = uploadRes.result.id;
        localStorage.setItem('trip_list_id', masterListId);
    }
    
    localStorage.setItem('trip_list_data', JSON.stringify(tripMasterData));
    localStorage.setItem('trip_list_modifiedTime', uploadRes.result.modifiedTime);
}

// 🌟 統一從本地 localStorage 讀取內容來渲染 UI
function renderTripList() {
    const listDiv = document.getElementById('trip-list'); 
    listDiv.innerHTML = ''; 

    const library = JSON.parse(localStorage.getItem('trip_library') || '{}');
    const localKeys = Object.keys(library);

    if (localKeys.length === 0) {
        listDiv.innerHTML = `
            <div class="h-32 flex flex-col items-center justify-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                <i data-lucide="${accessToken ? 'cloud' : 'inbox'}" class="w-8 h-8 mb-2 opacity-50"></i>
                <p class="text-sm">${accessToken ? '雲端與本地皆無行程' : '尚未匯入任何行程'}</p>
            </div>`;
        lucide.createIcons();
        return;
    }

    localKeys.forEach(baseName => {
        const tripData = library[baseName];
        
        // 從 JSON 內容讀取 metadata
        const displayTitle = tripData.metadata?.title || baseName;
        const displaySubtitle = tripData.metadata?.subtitle || '';
        
        // 比對是否在雲端清單中
        const cloudTrip = tripMasterData.trips.find(t => t.name === `${baseName}.json`);
        const isCloud = !!cloudTrip;
        const fileId = cloudTrip ? cloudTrip.id : null;

        const item = document.createElement('div');
        item.className = `group flex items-center justify-between p-4 bg-white rounded-xl border transition-all duration-200 ${isEditMode ? 'border-red-200 shadow-sm' : 'border-slate-100 hover:border-indigo-200 hover:shadow-md cursor-pointer'}`;
        
        item.innerHTML = `
            <div class="min-w-0 flex-grow pr-4" ${!isEditMode ? `onclick="openTrip('${fileId}', '${baseName}')"` : ''}>
                <div class="flex items-center">
                    <p class="font-bold text-slate-800 text-base truncate group-hover:text-indigo-700 transition-colors">${displayTitle}</p>
                    ${isCloud ? `<i data-lucide="cloud" class="w-4 h-4 text-blue-500 ml-2 shrink-0" title="雲端檔案"></i>` : ''}
                </div>
                ${displaySubtitle ? `<p class="text-xs text-slate-500 truncate mt-1.5 flex items-center gap-1"><i data-lucide="info" class="w-3 h-3 shrink-0"></i>${displaySubtitle}</p>` : ''}
            </div>
            ${isEditMode 
                ? `<button onclick="deleteTrip('${fileId}', '${baseName}.json')" class="text-red-500 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100 w-9 h-9 flex items-center justify-center rounded-lg transition-colors shrink-0"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` 
                : `<i data-lucide="chevron-right" class="w-5 h-5 text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0"></i>`
            }
        `;
        listDiv.appendChild(item);
    });
    
    lucide.createIcons(); 
}

// ==========================================
// 🚀 3. 基礎操作：上傳、開啟、刪除
// ==========================================

async function createOrUpdateTripFile(fileContent, fileName) {
    if (!accessToken) return null; 

    const existingTrip = tripMasterData.trips.find(t => t.name === fileName);
    
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";
    
    const metadata = { name: fileName, mimeType: 'application/json' };
    const multipartRequestBody =
        delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) + delimiter +
        'Content-Type: application/json\r\n\r\n' + fileContent + close_delim;

    let path = existingTrip ? `/upload/drive/v3/files/${existingTrip.id}` : '/upload/drive/v3/files';
    let method = existingTrip ? 'PATCH' : 'POST';

    const res = await gapi.client.request({
        path: path,
        method: method,
        params: { uploadType: 'multipart', fields: 'id' },
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body: multipartRequestBody
    });

    return res.result.id;
}

async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const fileContentStr = e.target.result;
        const baseName = file.name.replace('.json', '');
        
        try {
            const tripData = JSON.parse(fileContentStr); 
            
            // 寫入 localStorage 快取
            let library = JSON.parse(localStorage.getItem('trip_library') || '{}');
            library[baseName] = tripData;
            localStorage.setItem('trip_library', JSON.stringify(library));

            document.getElementById('status-text').innerHTML = '<span class="text-blue-500 flex items-center justify-center gap-1"><i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> 正在處理中...</span>';
            lucide.createIcons();

            if (accessToken) {
                const fileId = await createOrUpdateTripFile(fileContentStr, file.name);
                if (fileId) {
                    await updateTripListInCloud('add', fileId, file.name); // 🌟 不再傳遞 metadata
                    document.getElementById('status-text').innerHTML = '<span class="text-emerald-600 flex items-center justify-center gap-1"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> 匯入並同步完成</span>';
                }
            } else {
                document.getElementById('status-text').innerHTML = `<span class="text-slate-600">已儲存至本地</span>`;
            }
            
            renderTripList();

        } catch (error) {
            console.error(error);
            alert("檔案格式錯誤或上傳失敗。");
        }
    };
    reader.readAsText(file);
    event.target.value = ''; 
}

async function openTrip(fileId, baseName) {
    let library = JSON.parse(localStorage.getItem('trip_library') || '{}');
    
    // 確保有登入、有 fileId 且本地沒快取時，才去下載
    if (accessToken && fileId && fileId !== 'null' && !library[baseName]) {
        try {
            document.getElementById('status-text').innerHTML = '<span class="text-blue-500 flex items-center justify-center gap-1"><i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> 載入行程資料...</span>';
            lucide.createIcons();

            const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (res.ok) {
                const cloudData = await res.json();
                library[baseName] = cloudData;
                localStorage.setItem('trip_library', JSON.stringify(library));
            }
        } catch (error) {
            console.error("雲端載入失敗：", error);
        }
    }
    
    // 🌟 根據登入與雲端狀態，決定使用的網址參數
    if (accessToken && fileId && fileId !== 'null') {
        // 登入且為雲端檔案，帶入 trip_token (fileId)
        window.open(`planner.html?trip_token=${encodeURIComponent(fileId)}`, '_blank');
    } else {
        // 未登入或僅為本地檔案，帶入 trip_local (baseName)
        window.open(`planner.html?trip_local=${encodeURIComponent(baseName)}`, '_blank');
    }
}

function toggleEditMode() {
    isEditMode = !isEditMode;
    const btn = document.getElementById('edit-toggle');
    const txt = document.getElementById('edit-toggle-txt');
    
    if (isEditMode) {
        btn.classList.replace('bg-slate-50', 'bg-red-50');
        btn.classList.replace('text-slate-500', 'text-red-600');
        btn.classList.replace('border-slate-200', 'border-red-200');
        txt.textContent = "完成編輯";
        btn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i><span id="edit-toggle-txt">完成編輯</span>`;
    } else {
        btn.classList.replace('bg-red-50', 'bg-slate-50');
        btn.classList.replace('text-red-600', 'text-slate-500');
        btn.classList.replace('border-red-200', 'border-slate-200');
        txt.textContent = "管理模式";
        btn.innerHTML = `<i data-lucide="settings-2" class="w-3.5 h-3.5"></i><span id="edit-toggle-txt">管理模式</span>`;
    }
    renderTripList(); 
}

async function deleteTrip(fileId, fileName) {
    if (!confirm(`確定從系統中刪除「${fileName}」？\n此操作會將雲端檔案移至垃圾桶。`)) return;
    
    if (accessToken && fileId && fileId !== 'null') {
        document.getElementById('status-text').innerHTML = '<span class="text-blue-500 flex items-center justify-center gap-1"><i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> 刪除雲端檔案中...</span>';
        try {
            await gapi.client.drive.files.update({
                fileId: fileId,
                trashed: true
            });
            await updateTripListInCloud('remove', fileId);
        } catch (error) {
            console.error("雲端刪除失敗", error);
        }
    }

    // 清理本地快取
    let library = JSON.parse(localStorage.getItem('trip_library') || '{}');
    const baseName = fileName.replace('.json', '');
    delete library[baseName];
    localStorage.setItem('trip_library', JSON.stringify(library));
    
    document.getElementById('status-text').innerHTML = '<span class="text-emerald-600 flex items-center justify-center gap-1"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> 刪除成功</span>';
    renderTripList();
}

// ==========================================
// 📂 4. Google Drive 挑選器 (Picker API)
// ==========================================
function openDrivePicker() {
    if (!accessToken) {
        alert('請先連結 Google 雲端硬碟帳號！');
        return;
    }

    if (typeof google === 'undefined' || !google.picker || !google.picker.DocsView) {
        console.warn('Picker SDK 尚未完全就緒，正在嘗試重新建立連線...');
        gapiLoaded(); 
        return;
    }

    const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
        .setMimeTypes('application/json,text/plain');

    const picker = new google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(API_KEY)
        .setAppId(APP_ID)
        .setCallback(pickerCallback)
        .build();
        
    picker.setVisible(true);
}

async function pickerCallback(data) {
    if (data.action === google.picker.Action.PICKED) {
        const doc = data.docs[0];
        const fileId = doc.id;
        const fileName = doc.name;
        const baseName = fileName.replace('.json', '');
        
        const exists = tripMasterData.trips.some(t => t.id === fileId);
        if (exists) {
            alert(`該行程已存在於您的行程庫中！`);
            return; 
        }

        document.getElementById('status-text').innerHTML = '<span class="text-blue-500 flex items-center justify-center gap-1"><i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> 正在下載並解析內容...</span>';
        lucide.createIcons();

        try {
            const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (res.ok) {
                const fileContentStr = await res.text();
                const tripData = JSON.parse(fileContentStr);
                
                let library = JSON.parse(localStorage.getItem('trip_library') || '{}');
                library[baseName] = tripData;
                localStorage.setItem('trip_library', JSON.stringify(library));

                await updateTripListInCloud('add', fileId, fileName); // 🌟 不再傳遞 metadata
                
                document.getElementById('status-text').innerHTML = '<span class="text-emerald-600 flex items-center justify-center gap-1"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> 匯入成功 ✅</span>';
                lucide.createIcons();
            } else {
                throw new Error("無法下載該檔案內容");
            }
        } catch (error) {
            console.error("從 Drive 匯入解析失敗", error);
            document.getElementById('status-text').innerHTML = '<span class="text-red-500 flex items-center justify-center gap-1"><i data-lucide="alert-circle" class="w-3.5 h-3.5"></i> 匯入失敗</span>';
            lucide.createIcons();
        }
    }
}

function handleLogout() {
    if (!accessToken) return;

    google.accounts.oauth2.revoke(accessToken, () => {
        console.log('Google 授權已撤銷');
    });

    accessToken = null;
    sessionStorage.removeItem('gapi_token');
    sessionStorage.removeItem('gapi_token_expire');

    document.getElementById('status-text').innerHTML = '<span class="text-slate-400 flex items-center justify-center gap-1"><i data-lucide="cloud-off" class="w-3.5 h-3.5"></i> 尚未連結雲端</span>';
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.classList.add('hidden');
    document.getElementById('auth-btn-text').textContent = "連結 Google 雲端硬碟";
    document.getElementById('picker-btn').classList.add('hidden');

    renderTripList();
    lucide.createIcons();
}
