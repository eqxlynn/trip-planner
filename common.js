/**
 * 雲端檔案驗證與快取同步引擎 (共用模組)
 * @param {string} fileToken - Google Drive 的檔案 ID
 * @param {string} accessToken - 登入憑證
 * @returns {Object|null} - 成功回傳 JSON，失敗或已刪除回傳 null
 */
async function validateAndFetch(fileToken, accessToken) {
    if (!accessToken || !fileToken) return null;

    try {
        // 1. 使用原生 fetch 取得 Metadata (取代 gapi.client)
        const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileToken}?fields=id,name,trashed,modifiedTime`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        // 🛡️ 處理 Token 過期
        if (metaRes.status === 401) {
            console.warn("登入憑證已過期 (401 Unauthorized)");
            sessionStorage.removeItem('gapi_token');
            throw new Error("TOKEN_EXPIRED"); // 拋出錯誤讓呼叫端處理導向
        }

        if (!metaRes.ok) throw new Error("無法取得檔案狀態");
        const metaData = await metaRes.json();

        // 2. 處理雲端已刪除的狀況
        if (metaData.trashed) {
            console.warn(`檔案 [${metaData.name || fileToken}] 已在雲端刪除，清理本地快取...`);
            localStorage.removeItem(fileToken);
            localStorage.removeItem(`${fileToken}.modifiedTime`);
            return null;
        }

        const cloudModifiedTime = metaData.modifiedTime;
        const localModifiedTime = localStorage.getItem(`${fileToken}.modifiedTime`);
        const localContent = localStorage.getItem(fileToken);

        // 3. 判斷是否需要下載最新版本
        if (cloudModifiedTime !== localModifiedTime || !localContent) {
            console.log(`[${metaData.name || fileToken}] 發現更新或無快取，開始下載...`);
            
            const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileToken}?alt=media`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (res.ok) {
                const tripData = await res.json();
                
                // 更新實體與時間快取
                localStorage.setItem(fileToken, JSON.stringify(tripData));
                localStorage.setItem(`${fileToken}.modifiedTime`, cloudModifiedTime);
                
                return tripData;
            } else {
                throw new Error("檔案實體下載失敗");
            }
        } else {
            // 4. 秒速回傳本地快取
            console.log(`[${metaData.name || fileToken}] 本地快取已是最新版本 ⚡`);
            return JSON.parse(localContent);
        }

    } catch (error) {
        console.error(`處理 Token [${fileToken}] 時發生錯誤:`, error);
        // 如果是過期，往上拋出讓 UI 處理
        if (error.message === "TOKEN_EXPIRED") throw error;
        return null;
    }
}
