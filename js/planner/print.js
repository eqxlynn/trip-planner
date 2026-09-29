/**
 * 旅遊手冊列印引擎：預先產生 #print-container 內容，搭配 @media print 樣式輸出。
 */

/** visible 欄位可能是 boolean false 或字串 "false" */
function isVisible(item) {
    return item.visible !== false && item.visible !== 'false';
}

// ------------------------------------------
// 強制換頁：項目加上 "pageBreak": "before" | "after" (true 等同 "before")
// ------------------------------------------

const PRINT_BREAK = '<div class="print-force-break"></div>';

function getPageBreak(item) {
    const value = item && item.pageBreak;
    if (value === true || value === 'before') return 'before';
    if (value === 'after') return 'after';
    return null;
}

/**
 * 將一組項目加入 parts，遇到 pageBreak 時插入換頁標記。
 * grid 內的元素無法換頁，所以換頁處會把群組拆成多個 wrapGroup 容器。
 * @param {string[]} parts - 輸出片段 (PRINT_BREAK 代表換頁)
 * @param {Object[]} items - 已過濾的項目
 * @param {Function} renderItem - item → HTML
 * @param {Function} wrapGroup - 同一頁的項目 HTML 陣列 → 容器 HTML
 * @param {string} [headerHtml] - 區塊標題 (第一個項目要求換頁時，標題跟著換到下一頁)
 */
function appendWithPageBreaks(parts, items, renderItem, wrapGroup, headerHtml = '') {
    if (!items.length) return;
    if (getPageBreak(items[0]) === 'before') parts.push(PRINT_BREAK);
    if (headerHtml) parts.push(headerHtml);

    let group = [];
    const flush = () => {
        if (group.length) parts.push(wrapGroup(group));
        group = [];
    };

    items.forEach((item, index) => {
        const pageBreak = getPageBreak(item);
        if (pageBreak === 'before' && index > 0) {
            flush();
            parts.push(PRINT_BREAK);
        }
        group.push(renderItem(item));
        if (pageBreak === 'after') {
            flush();
            parts.push(PRINT_BREAK);
        }
    });
    flush();
}

/** 合併連續的換頁、移除結尾的換頁 (避免產生空白頁) */
function joinPrintParts(parts) {
    const result = [];
    parts.forEach(part => {
        if (part === PRINT_BREAK && (result.length === 0 || result[result.length - 1] === PRINT_BREAK)) return;
        result.push(part);
    });
    while (result[result.length - 1] === PRINT_BREAK) result.pop();
    return result.join('');
}

function getPrintableCards(items) {
    return (items || [])
        .filter(isVisible)
        .filter(item => item.title || item.desc);
}

const renderPrintCard = item => generateCardNodeHtml(item, true);

// 封面預設邊界 (沒有設定 metadata.coverMargin 時)
const DEFAULT_COVER_MARGIN = '0';

/**
 * 讀取 metadata.coverMargin，轉成 CSS padding 值。
 * - 數字：四邊相同，單位 mm (例如 15)
 * - 字串：CSS padding 簡寫 (例如 "30mm 15mm"、"10mm 20mm 10mm 20mm")，沒寫單位的數字視為 mm
 * 格式不正確時使用預設值。
 */
function getCoverMargin(metadata) {
    const value = metadata.coverMargin;
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return `${value}mm`;
    if (typeof value !== 'string') return DEFAULT_COVER_MARGIN;

    const tokens = value.trim().split(/\s+/);
    const valid = tokens.length >= 1 && tokens.length <= 4
        && tokens.every(t => /^\d+(\.\d+)?(mm|cm|in|px|pt)?$/.test(t));
    if (!valid) {
        console.warn(`metadata.coverMargin 格式不正確："${value}"，改用預設值`);
        return DEFAULT_COVER_MARGIN;
    }
    return tokens.map(t => (/^[\d.]+$/.test(t) ? `${t}mm` : t)).join(' ');
}

function generateCover(metadata) {
    const parts = [];
    appendWithPageBreaks(parts, getPrintableCards(metadata.guides), renderPrintCard,
        group => `<div class="w-full grid grid-cols-1 gap-2">${group.join('')}</div>`);

    return `
        <div class="text-center flex flex-col items-center print-page-break break-after-page" style="min-height: 270mm; padding: ${getCoverMargin(metadata)};">
            <h1 class="text-5xl font-black mb-4 text-slate-900 tracking-wide">${metadata.title || ''}</h1>
            <h2 class="text-xl font-bold text-slate-500 tracking-widest mb-8">${metadata.subtitle || ''}</h2>
            ${joinPrintParts(parts)}
        </div>
    `;
}

/** 行程總覽頁 */
function generateOverviewTable(dayKeys) {
    if (!dayKeys.length) return '';

    const meta = window.tripData.metadata || {};
    const daysHtml = dayKeys
        .filter(key => window.tripData.detail[key])
        .map(key => generateDayHeader(window.tripData.detail[key], getDayDisplayInfo(key)))
        .join('');

    return `
    <div class="print-page-break break-after-page">
        <div class="mb-2">
            <h1 class="text-4xl font-black text-slate-900">${meta.title || '行程總覽'}</h1>
            ${meta.subtitle ? `<div class="text-sm font-bold text-slate-500 mt-1">${meta.subtitle}</div>` : ''}
        </div>
        <div class="flex flex-col pt-1 gap-4">${daysHtml}</div>
    </div>`;
}

/**
 * 單日內頁。
 * @param {Object} day - 單日行程資料
 * @param {string} dateKey - "YYYY-MM-DD"
 */
function generateDayPage(day, dateKey) {
    if (!day) return '';

    const parts = [generateDayHeader(day, getDayDisplayInfo(dateKey))];

    const timeline = (day.timeline || [])
        .filter(isVisible)
        .filter(item => item.title || item.desc || item.time);
    appendWithPageBreaks(parts, timeline,
        item => `<div class="relative ml-2 border-l-2 border-slate-200">${generateTimelineNodeHtml(item, true)}</div>`,
        group => group.join(''),
        generateIndicatorNodeHtml('timeline', 'TIMELINE'));

    appendWithPageBreaks(parts, getPrintableCards(day.tips), renderPrintCard,
        group => `<div class="grid grid-cols-2 gap-2 mt-4">${group.join('')}</div>`);

    appendWithPageBreaks(parts, getPrintableCards(day.guides), renderPrintCard,
        group => `<div class="w-full grid grid-cols-1 gap-2 mt-4">${group.join('')}</div>`);

    return `
        <div class="break-before-page print-page-break">
            ${joinPrintParts(parts)}
        </div>
    `;
}

/** 產生完整列印內容：封面 → 行程總覽 → 每日內頁 */
function generatePrintContent() {
    const printContainer = document.getElementById('print-container');
    if (!printContainer) return;

    try {
        if (!window.tripData) {
            console.warn('列印失敗：找不到 tripData');
            return;
        }

        let html = generateCover(window.tripData.metadata || {});

        const detail = window.tripData.detail;
        if (detail) {
            const dayKeys = getSortedDayKeys(detail);
            html += generateOverviewTable(dayKeys);
            dayKeys.forEach(key => {
                html += generateDayPage(detail[key], key);
            });
        }

        printContainer.innerHTML = html;
        refreshIcons(printContainer);
    } catch (error) {
        console.error('列印模組發生錯誤:', error);
        printContainer.innerHTML = `
            <div class="p-10 text-center text-red-600 font-bold">
                <h2 class="text-2xl mb-2">列印畫面生成失敗 😢</h2>
                <p class="text-sm text-red-500">${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}
