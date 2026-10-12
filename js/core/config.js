/**
 * 全域設定：Google API 憑證與瀏覽器儲存空間使用的 key。
 * 以一般 <script> 載入，所有常數皆為全域可見。
 */

const APP_CONFIG = Object.freeze({
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/drive.file',
    // 雲端上的行程總表 (中央索引檔) 檔名
    MASTER_LIST_FILENAME: 'trip_list.json',
});

const STORAGE_KEYS = Object.freeze({
    // sessionStorage
    TOKEN: 'gapi_token',
    TOKEN_EXPIRE: 'gapi_token_expire',
    // localStorage
    MASTER_LIST_ID: 'trip_list_id',
    LOCAL_LIST: 'local_trip_list',
    ACTIVE_DAY: 'active-day',
    THEME: 'selected-theme',
    GOOGLE_CLIENT_ID: 'google_client_id',
    GOOGLE_API_KEY: 'google_api_key',
});

/**
 * Google API 憑證：不寫在程式碼裡，由使用者在行程庫頁面的「Google API 設定」輸入，存在這個瀏覽器的 localStorage。
 * - clientId：OAuth 2.0 用戶端 ID (登入必填)
 * - apiKey：API 金鑰 (Drive Picker 需要；gapi 載入 discovery 文件時可省略)
 * - appId：Picker 用的 App ID，即 Cloud 專案編號 (Client ID 開頭的數字)，自動推算
 */
const GoogleCredentials = {
    get clientId() {
        return (localStorage.getItem(STORAGE_KEYS.GOOGLE_CLIENT_ID) || '').trim();
    },
    get apiKey() {
        return (localStorage.getItem(STORAGE_KEYS.GOOGLE_API_KEY) || '').trim();
    },
    get appId() {
        const match = this.clientId.match(/^(\d+)-/);
        return match ? match[1] : '';
    },
    isConfigured() {
        return this.clientId !== '';
    },
    /** 空字串代表清除該欄位 */
    save(clientId, apiKey) {
        const set = (key, value) => (value ? localStorage.setItem(key, value) : localStorage.removeItem(key));
        set(STORAGE_KEYS.GOOGLE_CLIENT_ID, (clientId || '').trim());
        set(STORAGE_KEYS.GOOGLE_API_KEY, (apiKey || '').trim());
    },
};

// Drive API 回傳 401 時拋出的錯誤訊息，呼叫端可據此導向重新登入
const ERROR_TOKEN_EXPIRED = 'TOKEN_EXPIRED';

/**
 * 項目的 hide 欄位：列出要隱藏的模式，例如 "hide": ["print", "sheet"]，也可寫單一字串 "hide": "sheet"。
 * 網頁行程頁一律顯示；隱藏的項目其子行程一併隱藏。
 * - print：小冊子列印 (planner 列印)
 * - sheet：單張列印 (sheet.html)
 * - mirror：對照時間軸 (mirror.html)
 */
const HIDE_MODES = Object.freeze({ PRINT: 'print', SHEET: 'sheet', MIRROR: 'mirror' });

/** 項目是否在指定模式隱藏 */
function isHiddenIn(item, mode) {
    const hide = item && item.hide;
    return Array.isArray(hide) ? hide.includes(mode) : hide === mode;
}
