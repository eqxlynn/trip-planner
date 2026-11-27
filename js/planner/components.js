/**
 * 行程 HTML 片段產生器 (網頁與列印共用)。
 */

/** 時間軸圓點的背景與邊框 class (類別有 dot 時優先使用) */
function getEventBg(type) {
    const config = getTypeConfig(type);
    return config.dot || config.box;
}

/** 時間軸圓點內的 Icon HTML */
function getEventIcon(type, customIcon, sizeClass = 'w-4 h-4') {
    const config = getTypeConfig(type);
    const iconName = customIcon || config.defaultIcon;
    return renderIcon(iconName, `${sizeClass} ${config.icon}`);
}

// 子行程最多巢狀層數：timeline[i].subEvents[j].subEvents[k].subEvents[l]
const MAX_SUB_DEPTH = 3;

/**
 * 依子行程路徑取出項目。
 * @param {Object} item - 主行程
 * @param {string|number} path - "j" 或 "j.k" (以 . 分隔各層 index)
 */
function getSubEventByPath(item, path) {
    return String(path).split('.').reduce((node, i) => node?.subEvents?.[Number(i)], item);
}

/** 攤平時間軸 (含各層子行程)，順序為先主行程、後子行程 */
function flattenTimelineItems(items, depth = 0) {
    return (items || []).flatMap(item => [
        item,
        ...(depth < MAX_SUB_DEPTH ? flattenTimelineItems(item.subEvents, depth + 1) : []),
    ]);
}

/**
 * 單筆時間軸項目 (子行程 subEvents 最多 MAX_SUB_DEPTH 層，hide 含 "print" 的子行程不列印)。
 * @param {Object} item - 時間軸資料
 * @param {boolean} isPrint - 是否為列印模式
 * @param {number} depth - 巢狀層數 (主行程為 0；傳入 true 視為 1，相容舊呼叫)
 */
function generateTimelineNodeHtml(item, isPrint = false, depth = 0) {
    depth = Number(depth) || 0;
    const timeVal = item.time || '';
    const titleVal = item.title || '';
    const descVal = item.desc || '';
    const theme = getCurrentTheme();

    const timeHtml = timeVal
        ? `<span class="inline-block whitespace-nowrap ui-title font-black tracking-widest px-2 py-0.5 rounded-md ${theme.timelineTime}" ${PRINT_EXACT_STYLE}>${timeVal}</span>`
        : '';

    let html = `
        <div class="relative mt-2 pl-8 pb-0 break-inside-avoid transition-all duration-300 hover:translate-x-0.5">
            <div class="absolute w-6 h-6 -left-3 top-1 rounded-full border-2 border-transparent flex items-center justify-center z-10 bg-white ${getEventBg(item.type)}" ${PRINT_EXACT_STYLE}>
                ${getEventIcon(item.type, item.icon)}
            </div>
            <div class="${getTypeConfig(item.type).frame || ''}">
                <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    ${timeHtml}
                    <h3 class="ui-title text-slate-800">${titleVal}</h3>
                </div>
                <div class="text-sm text-slate-600 leading-relaxed">${parseMarkdownList(descVal, isPrint)}</div>
            </div>
    `;

    const subEvents = depth >= MAX_SUB_DEPTH ? [] : (item.subEvents || []).filter(sub => !isHiddenIn(sub, HIDE_MODES.PRINT));
    if (subEvents.length > 0) {
        html += `<div class="mt-2 border-l-2 border-slate-200">`;
        subEvents.forEach(subItem => {
            html += generateTimelineNodeHtml(subItem, isPrint, depth + 1);
        });
        html += `</div>`;
    }

    html += `</div>`;
    return html;
}

/**
 * 單張 Tip / Guide 卡片。
 * @param {Object} item - 卡片資料
 * @param {boolean} isPrint - 是否為列印模式
 */
function generateCardNodeHtml(item, isPrint = false) {
    const titleVal = item.title || '';
    const descVal = item.desc || '';
    const style = getTypeConfig(item.type || 'none');
    const iconName = item.icon || style.defaultIcon || 'info';

    // 沒有標題與內容時回傳空外框 (保留版面)
    if (!titleVal && !descVal) {
        return `<div class="border ${style.box} print:!bg-transparent print:border-slate-200 p-2 rounded-xl break-inside-avoid w-full" ${PRINT_EXACT_STYLE}></div>`;
    }

    // text-left 避免受父容器置中影響；w-full 讓卡片撐滿版面
    return `
        <div class="text-left w-full rounded-xl p-2 border relative group break-inside-avoid print:!bg-transparent ${style.box}" ${PRINT_EXACT_STYLE}>
            <div class="flex items-start items-center gap-2 mb-0">
                ${renderIcon(iconName, `w-5 h-5 ${style.icon} shrink-0`)}
                <h3 class="ui-title ${style.title} w-full">${titleVal}</h3>
            </div>
            <div class="text-sm text-slate-600 leading-relaxed">
                ${parseMarkdownList(descVal, isPrint)}
            </div>
        </div>
    `;
}

/** 區塊小標題 (例如列印頁中的「重大事件」「重點筆記」) */
function generateIndicatorNodeHtml(type, text, icon) {
    const style = getTypeConfig(type);
    const iconName = icon || style.defaultIcon || 'bookmark';
    return `
    <div class="pt-0 mt-2" ${PRINT_EXACT_STYLE}>
        <div class="mt-4 mb-2 flex items-center gap-2 text-slate-700 font-bold break-inside-avoid" ${PRINT_EXACT_STYLE}>
            ${renderIcon(iconName, `w-5 h-5 ${style.icon} shrink-0`)}
            <span class="tracking-widest text-sm">${text}</span>
        </div>
    </div>
    `;
}

/** 單日標題區塊 (日曆 + 標題 + 住宿 + 地區) */
function generateDayHeader(item, dateInfo) {
    const subtitleText = item.subtitle ? item.subtitle.replace(/^宿[\s:：]*/, '') : '';

    return `
        <div class="flex items-center py-0 break-inside-avoid">
            <div class="w-24 shrink-0 flex justify-center">
                ${generateCalendarIconHtml(dateInfo)}
            </div>

            <div class="flex-grow pl-1 pr-1 flex flex-col justify-center">
                <div class="text-3xl font-bold text-slate-800 leading-tight py-2">
                    ${item.title || ''}
                </div>

                <div class="flex justify-between items-start gap-6">
                    <div class="flex-grow min-w-0">
                        ${subtitleText ? `
                        <div class="text-sm font-medium text-slate-500 flex items-center gap-1">
                            <i data-lucide="${getCurrentTheme().subtitleIcon}" class="w-5 h-5 text-slate-400 shrink-0"></i>
                            <span class="truncate">${subtitleText}</span>
                        </div>
                        ` : ''}
                    </div>
                    ${item.region ? `<div class="text-sm text-slate-500 text-right shrink-0 max-w-[50%]">${item.region}</div>` : ''}
                </div>
            </div>
        </div>`;
}
