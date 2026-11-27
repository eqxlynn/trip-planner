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
 * key 可以帶「:後綴」當同一天的備案頁 (例如 "2026-10-28:2")，只取冒號前面的日期。
 * 注意：new Date("YYYY-MM-DD") 會以 UTC 解析，在 UTC 以西的時區會差一天。
 */
function parseDateKey(key) {
    const datePart = String(key || '').split(':')[0];
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return new Date(datePart);
}

/** 取得依日期排序後的天數 key (過濾掉非天數節點；同一天的備案頁依 key 字串排在後面) */
function getSortedDayKeys(detail) {
    if (!detail) return [];
    return Object.keys(detail)
        .filter(k => k !== 'metadata')
        .sort((a, b) => {
            const diff = parseDateKey(a) - parseDateKey(b);
            return Number.isNaN(diff) || diff === 0 ? a.localeCompare(b) : diff;
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

// 列印時強制保留背景色
const PRINT_EXACT_STYLE = 'style="-webkit-print-color-adjust: exact; print-color-adjust: exact;"';

/**
 * 打孔日曆 Icon (網頁版、小冊子與 sheet 共用)。
 * @param {Object} dateInfo - getDateDisplayInfo() 的回傳值
 */
function generateCalendarIconHtml(dateInfo) {
    if (!dateInfo) return '';

    // 週末換色
    let textClass = 'text-slate-800';
    let borderClass = 'border-slate-800';
    if (dateInfo.dowStr === 'Sat') {
        textClass = 'text-emerald-700';
        borderClass = 'border-emerald-700';
    } else if (dateInfo.dowStr === 'Sun') {
        textClass = 'text-rose-600';
        borderClass = 'border-rose-600';
    }

    const ring = `<div class="w-2 h-4 border-2 ${borderClass} rounded-full bg-white" ${PRINT_EXACT_STYLE}></div>`;

    return `
    <div class="relative w-[72px] h-[72px] shrink-0 mt-2 group transition-transform duration-200 hover:scale-105">
        <!-- 頂部鐵環 -->
        <div class="absolute -top-2 left-0 w-full flex justify-evenly z-10 px-2 pointer-events-none">
            ${ring}${ring}${ring}
        </div>

        <!-- 日曆主體 -->
        <div class="absolute top-0 left-0 w-full h-full border-[2.5px] ${borderClass} rounded-xl bg-white flex flex-col justify-between py-1.5 px-1 shadow-sm" ${PRINT_EXACT_STYLE}>
            <div class="text-[9px] font-bold text-center ${textClass} uppercase leading-none whitespace-nowrap overflow-hidden mt-0.5">
                ${dateInfo.startStr}
            </div>
            <div class="flex-grow flex items-center justify-center -my-1">
                <span class="text-[28px] font-black ${textClass} leading-none">${dateInfo.mainStr}</span>
            </div>
            <div class="text-[9px] font-bold text-center ${textClass} uppercase leading-none whitespace-nowrap overflow-hidden mb-0.5">
                ${dateInfo.endStr}
            </div>
        </div>

        <!-- 編輯模式 Hover 遮罩 (key 不是日期時不可改日期，不顯示) -->
        ${dateInfo.editable === false ? '' : `
        <div class="edit-only-ui absolute inset-0 bg-slate-900/5 rounded-xl z-10 pointer-events-none flex items-center justify-center transition-opacity duration-200 opacity-0 group-hover:opacity-100">
            <i data-lucide="edit-2" class="w-5 h-5 text-slate-700 opacity-60"></i>
        </div>`}
    </div>
    `;
}
