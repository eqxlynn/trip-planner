/**
 * 日期工具：行程以 "YYYY-MM-DD" 作為每日的 key。
 */

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** 將 Date 轉為本地時間的 "YYYY-MM-DD" */
function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 以本地時間解析 "YYYY-MM-DD"。
 * 注意：new Date("YYYY-MM-DD") 會以 UTC 解析，在 UTC 以西的時區會差一天。
 */
function parseDateKey(key) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || '');
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return new Date(key);
}

/** 取得依日期排序後的天數 key (過濾掉非天數節點) */
function getSortedDayKeys(detail) {
    if (!detail) return [];
    return Object.keys(detail)
        .filter(k => k !== 'metadata')
        .sort((a, b) => {
            const diff = parseDateKey(a) - parseDateKey(b);
            return Number.isNaN(diff) ? a.localeCompare(b) : diff;
        });
}

/**
 * 計算日期顯示資訊 (供日曆 Icon 與左側選單使用)。
 * @param {string} dateKey - "YYYY-MM-DD"
 */
function getDateDisplayInfo(dateKey) {
    const d = parseDateKey(dateKey);
    if (Number.isNaN(d.getTime())) {
        return { startStr: '???', mainStr: '??', endStr: '???', dowStr: '', full: dateKey, display: dateKey };
    }

    const month = MONTH_NAMES[d.getMonth()];
    const dow = DAY_NAMES[d.getDay()];
    return {
        startStr: month,
        mainStr: d.getDate().toString(),
        endStr: dow,
        dowStr: dow,
        full: dateKey,
        // 例如 "Tue, Nov 10"
        display: `${dow}, ${month} ${d.getDate()}`,
    };
}
