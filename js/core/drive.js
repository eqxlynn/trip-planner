/**
 * Google Drive 存取：檔案狀態檢查、快取同步、下載與上傳。
 */

const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files';
const MULTIPART_BOUNDARY = '-------314159265358979323846';

function buildAuthHeaders(accessToken) {
    return { Authorization: 'Bearer ' + accessToken };
}

/** 帶入 OAuth token 的 fetch；遇到 401 會清除登入狀態並拋出 TOKEN_EXPIRED */
async function driveFetch(url, accessToken) {
    const res = await fetch(url, { headers: buildAuthHeaders(accessToken) });
    if (res.status === 401) {
        console.warn('登入憑證已過期 (401 Unauthorized)');
        AuthSession.clear();
        throw new Error(ERROR_TOKEN_EXPIRED);
    }
    return res;
}

/** 下載 Drive 檔案內容並解析為 JSON */
async function downloadDriveJson(fileId, accessToken) {
    const res = await driveFetch(`${DRIVE_FILES_API}/${encodeURIComponent(fileId)}?alt=media`, accessToken);
    if (!res.ok) throw new Error('檔案實體下載失敗');
    return res.json();
}

/**
 * 比對雲端 modifiedTime 與本地快取，必要時下載最新版本。
 * @returns {Promise<{status: 'ok'|'deleted'|'error', data: Object|null}>}
 *   - ok：data 為最新內容
 *   - deleted：雲端檔案已刪除 (已清除本地快取)
 *   - error：網路或其他錯誤，data 為本地快取 (可能為 null)
 * @throws {Error} TOKEN_EXPIRED
 */
async function syncDriveFile(fileId, accessToken) {
    const cached = TripStorage.getJson(fileId);

    try {
        const metaRes = await driveFetch(
            `${DRIVE_FILES_API}/${encodeURIComponent(fileId)}?fields=id,name,trashed,modifiedTime`,
            accessToken
        );

        if (metaRes.status === 404) {
            console.warn(`檔案 [${fileId}] 在雲端不存在，清理本地快取...`);
            TripStorage.remove(fileId);
            return { status: 'deleted', data: null };
        }
        if (!metaRes.ok) throw new Error('無法取得檔案狀態');

        const meta = await metaRes.json();
        const label = meta.name || fileId;

        if (meta.trashed) {
            console.warn(`檔案 [${label}] 已在雲端刪除，清理本地快取...`);
            TripStorage.remove(fileId);
            return { status: 'deleted', data: null };
        }

        if (cached !== null && meta.modifiedTime === TripStorage.getModifiedTime(fileId)) {
            console.log(`[${label}] 本地快取已是最新版本`);
            return { status: 'ok', data: cached };
        }

        console.log(`[${label}] 發現更新或無快取，開始下載...`);
        const data = await downloadDriveJson(fileId, accessToken);
        TripStorage.setJson(fileId, data);
        TripStorage.setModifiedTime(fileId, meta.modifiedTime);
        return { status: 'ok', data };
    } catch (error) {
        if (error.message === ERROR_TOKEN_EXPIRED) throw error;
        console.error(`處理檔案 [${fileId}] 時發生錯誤:`, error);
        return { status: 'error', data: cached };
    }
}

/**
 * 取得檔案最新內容 (失敗時退回本地快取)。
 * @returns {Promise<Object|null>} 已刪除或無資料時回傳 null
 * @throws {Error} TOKEN_EXPIRED
 */
async function validateAndFetch(fileId, accessToken) {
    if (!accessToken || !fileId) return null;
    const { data } = await syncDriveFile(fileId, accessToken);
    return data;
}

/**
 * 以 multipart 上傳 JSON 到 Drive (需先載入 gapi.client)。
 * @param {Object} args
 * @param {string|null} [args.fileId] - 有值則更新 (PATCH)，否則新增 (POST)
 * @param {string} args.name - 檔名
 * @param {string} args.content - JSON 字串
 * @param {string} [args.fields='id'] - 要求回傳的欄位
 * @returns {Promise<Object>} Drive API 回傳的 result
 */
async function uploadDriveJson({ fileId = null, name, content, fields = 'id' }) {
    const delimiter = `\r\n--${MULTIPART_BOUNDARY}\r\n`;
    const closeDelimiter = `\r\n--${MULTIPART_BOUNDARY}--`;
    const metadata = { name, mimeType: 'application/json' };

    const body =
        delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) +
        delimiter + 'Content-Type: application/json\r\n\r\n' + content +
        closeDelimiter;

    const res = await gapi.client.request({
        path: fileId ? `/upload/drive/v3/files/${fileId}` : '/upload/drive/v3/files',
        method: fileId ? 'PATCH' : 'POST',
        params: { uploadType: 'multipart', fields },
        headers: { 'Content-Type': `multipart/related; boundary=${MULTIPART_BOUNDARY}` },
        body,
    });
    return res.result;
}
