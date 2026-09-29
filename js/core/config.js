/**
 * 全域設定：Google API 憑證與瀏覽器儲存空間使用的 key。
 * 以一般 <script> 載入，所有常數皆為全域可見。
 */

const APP_CONFIG = Object.freeze({
    CLIENT_ID: '972073752246-i2ojn6e5naofgjutee4kibok3hvkar1e.apps.googleusercontent.com',
    APP_ID: '972073752246',
    API_KEY: 'AIzaSyDiTnwwxr4VTyJNDrziYEJ59Tg187zVYc4',
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
});

// Drive API 回傳 401 時拋出的錯誤訊息，呼叫端可據此導向重新登入
const ERROR_TOKEN_EXPIRED = 'TOKEN_EXPIRED';
