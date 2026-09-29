/**
 * 瀏覽器儲存空間封裝。
 * - TripStorage：localStorage，以檔案 ID (Drive file ID 或本地檔名) 作為 key 快取行程 JSON
 * - AuthSession：sessionStorage，暫存 OAuth access token
 */

const TripStorage = {
    getJson(key, fallback = null) {
        if (!key) return fallback;
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.warn(`解析快取 [${key}] 失敗`, e);
            return fallback;
        }
    },

    setJson(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

    getModifiedTime(key) {
        return localStorage.getItem(`${key}.modifiedTime`);
    },

    setModifiedTime(key, modifiedTime) {
        localStorage.setItem(`${key}.modifiedTime`, modifiedTime);
    },

    /** 同時清除內容與時間戳記快取 */
    remove(key) {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}.modifiedTime`);
    },
};

const AuthSession = {
    getToken() {
        return sessionStorage.getItem(STORAGE_KEYS.TOKEN);
    },

    /** 有 token 且尚未過期才回傳，否則回傳 null */
    getValidToken() {
        const token = this.getToken();
        const expireTime = parseInt(sessionStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRE), 10);
        return token && expireTime && Date.now() < expireTime ? token : null;
    },

    save(token, expiresInSeconds) {
        sessionStorage.setItem(STORAGE_KEYS.TOKEN, token);
        sessionStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRE, String(Date.now() + expiresInSeconds * 1000));
    },

    clear() {
        sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
        sessionStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRE);
    },
};

// ------------------------------------------
// JSON 解析錯誤位置
// ------------------------------------------

/**
 * 從 JSON.parse 的錯誤訊息找出出錯的行號與欄號。
 * 支援 Chrome 的 "position N" 與 Firefox / 新版 Chrome 的 "line N column M"；
 * Safari 的訊息沒有位置資訊，此時 line / column 為 null。
 * @returns {{message: string, line: number|null, column: number|null, lineText: string}}
 */
function locateJsonError(error, text) {
    const message = error.message || String(error);
    const lines = text.split('\n');
    let line = null;
    let column = null;

    const lineColMatch = message.match(/line (\d+) column (\d+)/);
    const posMatch = message.match(/position (\d+)/);
    if (lineColMatch) {
        line = Number(lineColMatch[1]);
        column = Number(lineColMatch[2]);
    } else if (posMatch) {
        const before = text.slice(0, Number(posMatch[1]));
        line = before.split('\n').length;
        column = before.length - before.lastIndexOf('\n');
    }

    const lineText = line ? (lines[line - 1] || '').replace(/\r$/, '') : '';
    return { message, line, column, lineText };
}

/** 將 JSON.parse 的錯誤轉成一行文字說明 (含行號與欄號) */
function describeJsonError(error, text) {
    const { message, line, column } = locateJsonError(error, text);
    return line ? `第 ${line} 行，第 ${column} 欄：${message}` : message;
}
