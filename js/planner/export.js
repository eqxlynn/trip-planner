/**
 * 匯出行程 JSON 檔。
 */

/**
 * 綁定匯出按鈕。
 * @param {Object} args
 * @param {string} args.buttonId - 觸發匯出的按鈕 ID
 * @param {function} args.getDataCallback - 回傳要匯出的資料 (點擊當下才取值，確保是最新資料)
 * @param {string} [args.defaultFileName] - 沒有行程標題時使用的檔名
 */
function setupExportFeature({ buttonId, getDataCallback, defaultFileName }) {
    const exportBtn = document.getElementById(buttonId);
    if (!exportBtn) {
        console.warn(`[Export] 找不到 ID 為 '${buttonId}' 的按鈕。`);
        return;
    }

    exportBtn.addEventListener('click', () => {
        const data = typeof getDataCallback === 'function' ? getDataCallback() : null;
        if (!data) {
            alert('目前沒有資料可以匯出喔！');
            return;
        }

        try {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            // 優先以行程標題命名
            const title = data.metadata?.title;
            const fileName = title
                ? `${title.replace(/[\/\?<>\\:\*\|":]/g, '')}.json`
                : (defaultFileName || 'export.json');

            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('匯出 JSON 失敗：', error);
            alert('匯出過程中發生錯誤，請查看控制台 (Console)。');
        }
    });
}
