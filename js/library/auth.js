/**
 * 行程庫：Google 登入 (GIS + gapi)、登出與 Drive Picker。
 * gapiLoaded / gisLoaded 由 index.html 中外部 script 的 onload 呼叫，必須為全域函式。
 */

let tokenClient = null;

/**
 * 檢查 sessionStorage 中的 token；過期則執行登出清理。
 * @returns {string|null} 有效的 token
 */
function restoreSession() {
    const token = AuthSession.getValidToken();
    if (!token && AuthSession.getToken()) {
        console.warn('Token 已過期，請重新登入');
        handleLogout();
    }
    return token;
}

function gapiLoaded() {
    gapi.load('client:picker', {
        callback: async () => {
            try {
                await gapi.client.init({
                    apiKey: APP_CONFIG.API_KEY,
                    discoveryDocs: [APP_CONFIG.DISCOVERY_DOC],
                });
                console.log('gapi client 核心初始化成功');

                const token = restoreSession();
                if (token) {
                    gapi.client.setToken({ access_token: token });
                    libraryState.accessToken = token;
                    console.log('從暫存恢復登入狀態成功');
                    updateUIAfterLogin();
                    initCloudTripList();
                }
            } catch (error) {
                console.error('gapi 初始化失敗:', error);
            }
        },
        onerror: () => console.error('GAPI 載入發生錯誤或被瀏覽器封鎖'),
        timeout: 5000,
        ontimeout: () => console.error('GAPI 載入超時 (5秒)'),
    });
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: APP_CONFIG.CLIENT_ID,
        scope: APP_CONFIG.SCOPES,
        callback: (tokenResponse) => {
            if (tokenResponse.error !== undefined) {
                console.error('Google 登入失敗', tokenResponse);
                setStatus('error', '登入失敗');
                return;
            }

            libraryState.accessToken = tokenResponse.access_token;
            AuthSession.save(tokenResponse.access_token, tokenResponse.expires_in);
            console.log('登入成功，Token 已暫存');

            updateUIAfterLogin();
            initCloudTripList();
        },
    });
}

function handleAuthClick() {
    if (libraryState.accessToken) {
        initCloudTripList();
        return;
    }
    if (!tokenClient) {
        console.warn('Google 登入元件尚未載入完成');
        return;
    }
    tokenClient.requestAccessToken({ prompt: 'consent' });
}

function updateUIAfterLogin() {
    setStatus('success', '已連結雲端');
    toggleDisplay(document.getElementById('logout-btn'), true);
    toggleDisplay(document.getElementById('picker-btn'), true);
    // 登入後隱藏「匯入新行程」卡片
    toggleDisplay(document.getElementById('import-card'), false, null);
    document.getElementById('auth-btn-text').textContent = '重新整理雲端清單';
    document.getElementById('library-title').textContent = '雲端行程庫';
}

function handleLogout() {
    if (libraryState.accessToken && window.google?.accounts?.oauth2) {
        google.accounts.oauth2.revoke(libraryState.accessToken, () => console.log('Google 授權已撤銷'));
    }
    if (window.gapi?.client?.setToken) gapi.client.setToken(null);

    libraryState.accessToken = null;
    AuthSession.clear();

    setStatus('offline', '尚未連結雲端');
    toggleDisplay(document.getElementById('logout-btn'), false);
    toggleDisplay(document.getElementById('picker-btn'), false);
    toggleDisplay(document.getElementById('import-card'), true, null);
    document.getElementById('auth-btn-text').textContent = '連結 Google 帳號';
    document.getElementById('library-title').textContent = '我的行程庫';

    libraryState.masterListId = STORAGE_KEYS.LOCAL_LIST;
    libraryState.tripMasterData = normalizeMasterData(TripStorage.getJson(STORAGE_KEYS.LOCAL_LIST));
    renderTripList(libraryState.tripMasterData, false);
}

// ------------------------------------------
// Google Drive Picker
// ------------------------------------------

function openDrivePicker() {
    if (!libraryState.accessToken) {
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
        .setOAuthToken(libraryState.accessToken)
        .setDeveloperKey(APP_CONFIG.API_KEY)
        .setAppId(APP_CONFIG.APP_ID)
        .setCallback(pickerCallback)
        .build();

    picker.setVisible(true);
}

async function pickerCallback(data) {
    if (data.action !== google.picker.Action.PICKED) return;

    const doc = data.docs[0];
    if (libraryState.tripMasterData.trips.some(t => t.id === doc.id)) {
        alert('該行程已存在於您的行程庫中！');
        return;
    }

    setStatus('loading', '正在下載並解析內容...');
    try {
        const tripData = await downloadDriveJson(doc.id, libraryState.accessToken);
        TripStorage.setJson(doc.id, tripData);

        // 以行程標題寫入雲端總表
        await updateTripListInCloud('add', doc.id, tripData.metadata?.title || doc.name);
        setStatus('success', '匯入成功 ✅');
    } catch (error) {
        console.error('從 Drive 匯入解析失敗', error);
        setStatus('error', '匯入失敗');
    }
}
