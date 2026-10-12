/**
 * 行程庫：Google 登入 (整頁跳轉的 OAuth 2.0 implicit flow + gapi)、登出與 Drive Picker。
 * gapiLoaded 由 index.html 中外部 script 的 onload 呼叫，必須為全域函式。
 *
 * 登入流程：按「連結 Google 帳號」→ 整頁跳到 Google 授權頁 → 授權後跳回 index.html，
 * access token 放在網址 #hash；本檔載入時立即解析並存入 sessionStorage，再清掉網址上的 hash。
 * 不使用彈出視窗，因此不受彈出視窗封鎖、第三方 Cookie 或 COOP 影響。
 *
 * 需在 Google Cloud Console 的 OAuth 用戶端「已授權的重新導向 URI」登記 getOAuthRedirectUri() 的值，
 * 例如 http://127.0.0.1:5500/index.html、https://project-y0dl4.vercel.app/index.html。
 */

const OAUTH_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';
// 跳轉前存入 sessionStorage 的隨機值，跳回時比對，防止偽造的回應 (CSRF)
const OAUTH_STATE_KEY = 'oauth_state';

/** 跳回的網址：固定為同目錄的 index.html (不含 query / hash)，須與 Console 登記的值完全一致 */
function getOAuthRedirectUri() {
    return new URL('index.html', location.href).href.split(/[?#]/)[0];
}

/**
 * 解析 Google 跳回時網址 #hash 中的授權結果，成功則存入 AuthSession。
 * 在 script 載入時就執行 (早於 gapiLoaded 的 restoreSession)，此時 DOM 可能尚未就緒，因此只回傳要顯示的錯誤。
 * @returns {string|null} 失敗時要顯示在狀態列的訊息
 */
function consumeOAuthRedirect() {
    const params = new URLSearchParams(location.hash.slice(1));
    if (!params.has('access_token') && !params.has('error')) return null;

    // 先清掉網址上的 token，避免留在歷史紀錄或被複製分享
    history.replaceState(null, '', location.pathname + location.search);

    const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
    sessionStorage.removeItem(OAUTH_STATE_KEY);

    if (params.has('error')) {
        console.error(`[auth] 連結 Google 帳號：失敗 (${params.get('error')}) redirect_uri=${getOAuthRedirectUri()}`);
        return params.get('error') === 'access_denied' ? '已取消授權' : '登入失敗';
    }
    if (!expectedState || params.get('state') !== expectedState) {
        console.error('[auth] 連結 Google 帳號：失敗 (state 不符，忽略這次回應)');
        return '登入失敗';
    }

    const expiresIn = Number(params.get('expires_in')) || 3600;
    AuthSession.save(params.get('access_token'), expiresIn);
    console.log(`[auth] 連結 Google 帳號：成功 (token 有效 ${expiresIn} 秒，已暫存)`);
    return null;
}

const oauthRedirectError = consumeOAuthRedirect();
if (oauthRedirectError) {
    document.addEventListener('DOMContentLoaded', () => setStatus('error', oauthRedirectError));
}

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
                // API Key 可省略 (discovery 文件為公開資源)，有設定才帶入
                const apiKey = GoogleCredentials.apiKey;
                await gapi.client.init({
                    ...(apiKey ? { apiKey } : {}),
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

function handleAuthClick() {
    if (libraryState.accessToken) {
        console.log('[auth] 連結 Google 帳號：已登入，重新整理雲端清單');
        initCloudTripList();
        return;
    }
    if (!GoogleCredentials.isConfigured()) {
        console.warn('[auth] 連結 Google 帳號：尚未設定 Client ID');
        setStatus('error', '請先在「Google API 設定」輸入 Client ID');
        openGoogleSettings();
        return;
    }

    const state = crypto.getRandomValues(new Uint32Array(4)).join('-');
    sessionStorage.setItem(OAUTH_STATE_KEY, state);

    const url = new URL(OAUTH_AUTH_ENDPOINT);
    url.search = new URLSearchParams({
        client_id: GoogleCredentials.clientId,
        redirect_uri: getOAuthRedirectUri(),
        response_type: 'token',
        scope: APP_CONFIG.SCOPES,
        include_granted_scopes: 'true',
        prompt: 'select_account',
        state,
    }).toString();

    console.log(`[auth] 連結 Google 帳號：跳轉到 Google 授權頁 (redirect_uri=${getOAuthRedirectUri()})`);
    location.assign(url.href);
}

// ------------------------------------------
// Google API 設定 (Client ID / API Key 存在 localStorage)
// ------------------------------------------

function openGoogleSettings() {
    const details = document.getElementById('google-settings');
    if (!details) return;
    details.open = true;
    const input = document.getElementById(GoogleCredentials.clientId ? 'google-api-key' : 'google-client-id');
    if (input) input.focus();
}

/** 將已存的值填入表單；尚未設定 Client ID 時自動展開 */
function initGoogleSettingsForm() {
    const clientInput = document.getElementById('google-client-id');
    const keyInput = document.getElementById('google-api-key');
    if (!clientInput || !keyInput) return;
    clientInput.value = GoogleCredentials.clientId;
    keyInput.value = GoogleCredentials.apiKey;
    if (!GoogleCredentials.isConfigured()) document.getElementById('google-settings').open = true;
}

function saveGoogleSettings() {
    const clientId = document.getElementById('google-client-id').value.trim();
    const apiKey = document.getElementById('google-api-key').value.trim();
    if (clientId && !clientId.endsWith('.apps.googleusercontent.com')) {
        alert('Client ID 格式不正確，應以 .apps.googleusercontent.com 結尾');
        return;
    }
    GoogleCredentials.save(clientId, apiKey);
    console.log(`[auth] 已儲存 Google API 設定 (Client ID ${clientId ? '已設定' : '未設定'}，API Key ${apiKey ? '已設定' : '未設定'})`);
    // gapi 已用舊的設定初始化，重新載入讓新設定生效 (登入狀態存在 sessionStorage，不受影響)
    location.reload();
}

function clearGoogleSettings() {
    if (!confirm('確定要清除這個瀏覽器儲存的 Client ID 與 API Key？')) return;
    if (libraryState.accessToken) handleLogout();
    GoogleCredentials.save('', '');
    console.log('[auth] 已清除 Google API 設定');
    location.reload();
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
    if (libraryState.accessToken) {
        // 撤銷授權 (no-cors：只需送出，不需讀取回應)
        fetch(`${OAUTH_REVOKE_ENDPOINT}?token=${encodeURIComponent(libraryState.accessToken)}`, { method: 'POST', mode: 'no-cors' })
            .then(() => console.log('Google 授權已撤銷'))
            .catch(error => console.warn('撤銷 Google 授權失敗', error));
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

    if (!GoogleCredentials.apiKey) {
        alert('從 Google Drive 匯入需要 API Key，請在「Google API 設定」輸入');
        openGoogleSettings();
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
        .setDeveloperKey(GoogleCredentials.apiKey)
        .setAppId(GoogleCredentials.appId)
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
