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
// 預設先從本地列表讀取（未登入狀態的基礎）
let tripMasterData = JSON.parse(localStorage.getItem('local_trip_list') || '{"trips":[]}');

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
                    initCouldTripList(); 
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
            initCouldTripList(); 
        },
    });

    document.getElementById('auth-btn').onclick = () => {
        if (!accessToken) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            initCouldTripList(); 
        }
    };
}; 

function updateUIAfterLogin() {
    document.getElementById('status-text').innerHTML = '<span class="text-emerald-600 flex items-center justify-center gap-1"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> 已連結雲端</span>';
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    document.getElementById('auth-btn-text').textContent = "🔄 重新整理雲端清單";
    document.getElementById('library-title').textContent = "雲端行程庫"; 
    document.getElementById('import-login-prompt').classList.add('hidden');
    document.getElementById('picker-btn').classList.remove('hidden');
    lucide.createIcons();
}

// ==========================================
// 📂 2. 中央索引檔 (trip_list.json) 核心引擎
// ==========================================

async function initCouldTripList() {
    if (!accessToken) return;

    try {
        document.getElementById('status-text').innerHTML = '<span class="text-blue-500 flex items-center justify-center gap-1"><i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> 檢查雲端索引中...</span>';
        
        // --- 步驟 1：用 trip_list.json 找到 token id ---
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

        // --- 步驟 2：對總表 Token call validateAndFetch ---
        const masterData = await validateAndFetch(masterListId, accessToken);
        tripMasterData = masterData || { trips: [] };

        // --- 步驟 3：平行檢查每一個 file token，並記錄失效的檔案 ---
        if (tripMasterData.trips && tripMasterData.trips.length > 0) {
            document.getElementById('status-text').innerHTML = '<span class="text-blue-500 flex items-center justify-center gap-1"><i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> 同步個別行程中...</span>';
            
            // 使用 async wrapper 包裝 Promise，將 trip.id 帶入回傳結果中
            const validationPromises = tripMasterData.trips.map(async (trip) => {
                try {
                    const result = await validateAndFetch(trip.id, accessToken);
                    // 假設 validateAndFetch 發現檔案不存在時會回傳 null
                    return { tripId: trip.id, exists: result !== null }; 
                } catch (error) {
                    console.warn(`行程 ${trip.id} 檢查發生異常:`, error);
                    return { tripId: trip.id, exists: false };
                }
            });
            
            // 等待所有行程檢查完畢
            const results = await Promise.all(validationPromises);
            
            // 找出不存在的 file token
            const missingTripIds = results.filter(r => !r.exists).map(r => r.tripId);
            
            // --- 步驟 4：如果發現幽靈行程，清理 tripMasterData 並上傳更新 ---
            if (missingTripIds.length > 0) {
                console.log(`發現 ${missingTripIds.length} 個已失效的雲端行程，正在從總表中移除...`, missingTripIds);
                
                // 過濾掉不存在的行程
                tripMasterData.trips = tripMasterData.trips.filter(
                    trip => !missingTripIds.includes(trip.id)
                );
                
                document.getElementById('status-text').innerHTML = '<span class="text-blue-500 flex items-center justify-center gap-1"><i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> 清理無效索引中...</span>';
                
                // 執行更新總表至雲端的動作 (請確保這個 function 會將更新後的 tripMasterData 存入 masterListId)
                await saveMasterListToCloud(); 
            }
        }

        // --- 完成狀態與畫面渲染 ---
        document.getElementById('status-text').innerHTML = '<span class="text-emerald-600 flex items-center justify-center gap-1"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> 同步完成</span>';
        
        if (typeof renderTripList === 'function') {
            renderTripList();
        }
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

    } catch (error) {
        console.error("初始化中央索引檔失敗：", error);
        document.getElementById('status-text').innerHTML = '<span class="text-red-500 flex items-center justify-center gap-1"><i data-lucide="alert-circle" class="w-3.5 h-3.5"></i> 索引同步失敗</span>';
    }
}

// 🌟 批次下載雲端檔案到本地 localStorage (用 File ID 當作 Key)
async function syncCloudTripsToLocal() {
    if (!accessToken || !tripMasterData.trips.length) return;
    
    document.getElementById('status-text').innerHTML = '<span class="text-blue-500 flex items-center justify-center gap-1"><i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> 下載並同步行程中...</span>';
    lucide.createIcons();

    const downloadPromises = tripMasterData.trips.map(async (trip) => {
        try {
            const res = await fetch(`https://www.googleapis.com/drive/v3/files/${trip.id}?alt=media`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (res.ok) {
                const tripData = await res.json();
                // 🎯 核心修改：直接用 trip.id 當作 localStorage 的 Key
                localStorage.setItem(trip.id, JSON.stringify(tripData)); 
            }
        } catch (err) {
            console.error(`下載 ${trip.name} 失敗:`, err);
        }
    });

    await Promise.all(downloadPromises);
}

// 🌟 移除 title 與 subtitle 參數，回歸純粹的索引記錄
async function updateTripListInCloud(action, fileId, fileName = "") {
    if (!masterListId || !accessToken) return;

    try {
        // ✨ 直接使用統一的 validateAndFetch 來處理檢查與更新快取
        const latestMasterData = await validateAndFetch(masterListId);
        tripMasterData = latestMasterData || { trips: [] };

        if (action === 'add') {
            const existingIndex = tripMasterData.trips.findIndex(trip => trip.id === fileId);
            if (existingIndex === -1) {
                tripMasterData.trips.push({ id: fileId, name: fileName });
            } 
        } else if (action === 'remove') {
            tripMasterData.trips = tripMasterData.trips.filter(trip => trip.id !== fileId);
        }

        await saveMasterListToCloud();
        
        if (typeof renderTripList === 'function') {
            renderTripList();
        }
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
        // trip_list_id 還是需要保留，這樣下次載入才知道要去哪裡找總表 Token
        localStorage.setItem('trip_list_id', masterListId); 
    }
    
    // ✨ 對齊 validateAndFetch：使用 Token (masterListId) 作為 Key 更新本地快取
    localStorage.setItem(masterListId, JSON.stringify(tripMasterData));
    localStorage.setItem(`${masterListId}.modifiedTime`, uploadRes.result.modifiedTime);
}

// 🌟 統一從本地 localStorage (Token架構) 讀取內容來渲染 UI
function renderTripList() {
    const listDiv = document.getElementById('trip-list'); 
    listDiv.innerHTML = ''; 

    // 1. 確保 tripMasterData 存在且有資料
    const trips = tripMasterData?.trips || [];

    if (trips.length === 0) {
        listDiv.innerHTML = `
            <div class="h-32 flex flex-col items-center justify-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                <i data-lucide="${accessToken ? 'cloud' : 'inbox'}" class="w-8 h-8 mb-2 opacity-50"></i>
                <p class="text-sm">${accessToken ? '雲端與本地皆無行程' : '尚未匯入任何行程'}</p>
            </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    // 2. 直接遍歷總表陣列，取代舊的 Object.keys(library)
    trips.forEach(trip => {
        const fileId = trip.id;
        const baseName = trip.name ? trip.name.replace('.json', '') : '未命名行程';
        
        // 3. 🎯 核心修改：利用 Token (fileId) 從快取獨立抓取資料
        const localContent = localStorage.getItem(fileId);
        let displayTitle = baseName;
        let displaySubtitle = '';
        
        // 若本地有快取，嘗試解析並抓取 metadata
        if (localContent) {
            try {
                const tripData = JSON.parse(localContent);
                displayTitle = tripData.metadata?.title || baseName;
                displaySubtitle = tripData.metadata?.subtitle || '';
            } catch (e) {
                console.warn(`解析行程 [${fileId}] 快取失敗`, e);
            }
        }

        // 因為資料來源是 tripMasterData，所以一定是雲端同步的行程
        const isCloud = true; 

        const item = document.createElement('div');
        item.className = `group flex items-center justify-between p-4 bg-white rounded-xl border transition-all duration-200 ${isEditMode ? 'border-red-200 shadow-sm' : 'border-slate-100 hover:border-indigo-200 hover:shadow-md cursor-pointer'}`;
        
        const safeTitle = displayTitle.replace(/'/g, "\\'");

        item.innerHTML = `
            <div class="min-w-0 flex-grow pr-4" ${!isEditMode ? `onclick="openTrip('${fileId}', '${baseName}')"` : ''}>
                <div class="flex items-center">
                    <p class="font-bold text-slate-800 text-base truncate group-hover:text-indigo-700 transition-colors">${displayTitle}</p>
                    ${isCloud ? `<i data-lucide="cloud" class="w-4 h-4 text-blue-500 ml-2 shrink-0" title="雲端檔案"></i>` : ''}
                </div>
                ${displaySubtitle ? `<p class="text-xs text-slate-500 truncate mt-1.5 flex items-center gap-1"><i data-lucide="info" class="w-3 h-3 shrink-0"></i>${displaySubtitle}</p>` : ''}
            </div>
            ${isEditMode 
                ? `<button onclick="deleteTrip('${fileId}', '${safeTitle}')" class="text-red-500 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100 w-9 h-9 flex items-center justify-center rounded-lg transition-colors shrink-0"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` 
                : `<i data-lucide="chevron-right" class="w-5 h-5 text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0"></i>`
            }
        `;
        listDiv.appendChild(item);
    });
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons(); 
    }
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
        // 🎯 這裡直接把去掉副檔名的檔名當作 fileId (Token)
        const fileId = file.name.replace('.json', ''); 
        
        try {
            const tripData = JSON.parse(fileContentStr); 
            
            // 🎯 核心修改 1：直接以 fileId 作為 Key 儲存單一行程快取
            localStorage.setItem(fileId, JSON.stringify(tripData));

            document.getElementById('status-text').innerHTML = '<span class="text-blue-500 flex items-center justify-center gap-1"><i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> 正在處理中...</span>';
            if (typeof lucide !== 'undefined') lucide.createIcons();

            if (accessToken) {
                // 雲端模式：上傳檔案並更新雲端的 trip_list.json
                const driveFileId = await createOrUpdateTripFile(fileContentStr, file.name);
                if (driveFileId) {
                    await updateTripListInCloud('add', driveFileId, file.name);
                    document.getElementById('status-text').innerHTML = '<span class="text-emerald-600 flex items-center justify-center gap-1"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> 匯入並同步完成</span>';
                }
            } else {
                // 🎯 核心修改 2：本地模式，更新 local_trip_list 索引
                const existingIndex = tripMasterData.trips.findIndex(t => t.id === fileId);
                if (existingIndex === -1) {
                    tripMasterData.trips.push({ id: fileId, name: file.name });
                    localStorage.setItem('local_trip_list', JSON.stringify(tripMasterData));
                }
                document.getElementById('status-text').innerHTML = `<span class="text-slate-600 flex items-center justify-center gap-1"><i data-lucide="save" class="w-3.5 h-3.5"></i> 已儲存至本地</span>`;
            }
            
            // 由於總表結構統一了，這裡直接呼叫 render 即可
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
    if (!fileId || fileId === 'null') return;

    // 1. 如果有登入，使用統一的 validateAndFetch 來檢查與更新快取
    if (accessToken) {
        document.getElementById('status-text').innerHTML = '<span class="text-blue-500 flex items-center justify-center gap-1"><i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> 準備載入行程...</span>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        await validateAndFetch(fileId);
        
        // 開啟雲端行程 (傳遞 Drive Token)
        window.open(`planner.html?trip_token=${encodeURIComponent(fileId)}`, '_blank');
    } else {
        // 2. 如果未登入，fileId 就是本地的 Key，直接開啟本地行程
        window.open(`planner.html?trip_local=${encodeURIComponent(fileId)}`, '_blank');
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

async function deleteTrip(fileId, title) {
    // 1. 使用傳入的 title 顯示防呆確認視窗
    if (!confirm(`確定從系統中刪除行程「${title}」？\n此操作會將雲端檔案移至垃圾桶 (若有連結雲端)。`)) return;
    
    if (accessToken && fileId && fileId !== 'null') {
        // 雲端模式刪除
        document.getElementById('status-text').innerHTML = '<span class="text-blue-500 flex items-center justify-center gap-1"><i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> 刪除雲端檔案中...</span>';
        try {
            /*
            await gapi.client.drive.files.update({
                fileId: fileId,
                trashed: true
            });
            */
            await updateTripListInCloud('remove', fileId);
        } catch (error) {
            console.error("雲端刪除失敗", error);
        }
    } else {
        // 本地模式刪除 (從 local_trip_list 移除)
        tripMasterData.trips = tripMasterData.trips.filter(trip => trip.id !== fileId);
        localStorage.setItem('local_trip_list', JSON.stringify(tripMasterData));
    }

    // 2. 統一清理該 Token/Key 的本地實體快取
    localStorage.removeItem(fileId);
    localStorage.removeItem(`${fileId}.modifiedTime`);
    
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
                
                // 🎯 1. 新架構：直接用 fileId (Token) 當作 Key 獨立儲存
                localStorage.setItem(fileId, JSON.stringify(tripData));

                // 🎯 2. 順便修正上一個 Bug：抽出真實標題，寫入雲端總表
                const tripTitle = tripData.metadata?.title || baseName;
                await updateTripListInCloud('add', fileId, tripTitle);
                
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
