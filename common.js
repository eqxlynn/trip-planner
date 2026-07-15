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

/**
 * 將 Markdown 語法轉換為 HTML
 * @param {string} text - 原始 Markdown 文字
 * @param {boolean} isPrint - 是否為列印模式 (預設為 false)
 */
function parseMarkdownList(text, isPrint = false) {
    if (!text || typeof text !== 'string') return '';
    
    let html = text;

    // 1. 處理粗體
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 2. 處理圖片 ![替代文字](圖片路徑)
    if (isPrint) {
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="w-full mt-3 rounded-xl border border-slate-200 shadow-sm break-inside-avoid">');
    } else {
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="w-full mt-3 rounded-xl border border-slate-200 shadow-sm">');
    }

    // 3. 處理連結 [文字](網址)
    if (isPrint) {
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '');
    } else {
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
            return `<a href="${url}" target="_blank" class="inline-flex items-center gap-0.5 bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 px-1.5 py-0.5 rounded text-xs font-bold tracking-wide transition-colors duration-200 shadow-sm align-middle mx-1 -translate-y-[1px]"><span>${text}</span><i data-lucide="external-link" class="w-3 h-3"></i></a>`;
        });
    }

    // 4. 處理混排的清單與一般段落 (支援巢狀階層)
    const lines = html.split('\n');
    let finalHtml = '';
    let mainListType = null; // 'ol' 或 'ul'，追蹤主清單
    let inSubList = false;   // 追蹤是否在子清單內

    lines.forEach(line => {
        // 先不要 trim()，因為我們需要計算前面的空白數量來判斷階層
        if (!line.trim()) return; 

        // Regex 解釋：抓取 (1.前方空白) (2.符號或數字) (3.文字內容)
        const ulMatch = /^(\s*)[-*]\s+(.*)/.exec(line);
        const olMatch = /^(\s*)(?:\d+|#)\.\s+(.*)/.exec(line);

        if (ulMatch || olMatch) {
            const isUl = !!ulMatch;
            const match = isUl ? ulMatch : olMatch;
            const indentLength = match[1].length; // 取得前方空白的長度
            const content = match[2];             // 取得清單文字

            const isSubItem = indentLength > 0;   // 有縮排就是子項目

            if (isSubItem) {
                // 【處理子清單】
                if (!inSubList) {
                    // 開啟子清單 (使用空心圓 list-[circle] 並往內縮排)
                    finalHtml += '<ul class="list-[circle] list-outside ml-6 space-y-1 mt-1.5 mb-2 text-slate-600">';
                    inSubList = true;
                }
                finalHtml += `<li>${content}</li>`;
            } else {
                // 【處理主清單】
                
                // 如果原本在子清單內，要先把它關閉
                if (inSubList) {
                    finalHtml += '</ul>';
                    inSubList = false;
                }
                
                const targetType = isUl ? 'ul' : 'ol';
                
                if (mainListType !== targetType) {
                    // 如果切換了主清單類型，先關閉舊的
                    if (mainListType) {
                        finalHtml += mainListType === 'ol' ? '</ol>' : '</ul>';
                    }
                    // 開啟新的主清單
                    const listClass = isUl ? 'list-disc' : 'list-decimal';
                    finalHtml += `<${targetType} class="${listClass} list-outside ml-5 space-y-1.5 ui-desc mt-2 mb-2">`;
                    mainListType = targetType;
                }
                finalHtml += `<li>${content}</li>`;
            }
        } else {
            // 【處理一般文字 / 段落】
            const trimmed = line.trim();
            
            // 遇到一般文字，先把所有清單標籤關閉
            if (inSubList) {
                finalHtml += '</ul>';
                inSubList = false;
            }
            if (mainListType) {
                finalHtml += mainListType === 'ol' ? '</ol>' : '</ul>';
                mainListType = null;
            }
            
            // 輸出一般文字
            finalHtml += `<div class="ui-desc mt-1">${trimmed}</div>`;
        }
    });

    // 迴圈結束後，確保未關閉的清單標籤被正確關閉
    if (inSubList) {
        finalHtml += '</ul>';
    }
    if (mainListType) {
        finalHtml += mainListType === 'ol' ? '</ol>' : '</ul>';
    }

    return finalHtml;
}

/**
 * 透過 yyyy-mm-dd 計算並格式化日期與星期
 * @param {string} dateString - 格式可以為 "上方字-中間字-下方字" (例如: "1684-清-1895")
 */
function getDateDisplayInfo(dateString) {
    // 使用 '-' 來切割字串
    const parts = dateString.split('-');
    if (parts.length >= 3) {
        let dayContent = parts[1];
        // 預設左側選單顯示的完整文字 (例如: 12TH 漢人活動 1683)
        let fullText = dateString.replace(/--/g, ' ');

        // 【新增邏輯】如果中間那段是以 "icon:" 開頭，就自動幫它轉成 HTML 標籤
        if (dayContent.startsWith('icon:')) {
            const iconName = dayContent.split(':')[1];
            // w-7 h-7 加上 mx-auto 讓圖示大小適中且完美置中
            dayContent = `<i data-lucide="${iconName}" class="w-7 h-7 mx-auto"></i>`;

            // 把左側選單的文字改成用 "~" 連接，避免印出 HTML 原始碼
            fullText = `${parts[0]} ~ ${parts[2]}`;
        }
        return {
            startStr: parts[0],  // 取得第 1 個部分 (例如: 1684)
            mainStr: dayContent,    // 取得第 2 個部分 (例如: 清)
            endStr: parts[2],    // 取得第 3 個部分 (例如: 1895)
            // full 顯示在左側選單，把 '-' 換成空白會比較好看 (例如: "1684 清 1895")
            full: dateString
        };
    }

    // 防呆機制：如果 JSON 裡的名稱沒有 '-'，就退回原本的模式保護版面不變形
    return {
        startStr: "ERA",
        mainStr: dateString.substring(0, 1),
        endStr: "HISTORY",
        full: dateString
    };
}
