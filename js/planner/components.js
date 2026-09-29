/**
 * 行程 HTML 片段產生器 (網頁與列印共用)。
 */

// 列印時強制保留背景色
const PRINT_EXACT_STYLE = 'style="-webkit-print-color-adjust: exact; print-color-adjust: exact;"';

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

/**
 * 單筆時間軸項目 (子行程 subEvents 只支援一層，visible: false 的子行程不列印)。
 * @param {Object} item - 時間軸資料
 * @param {boolean} isPrint - 是否為列印模式
 * @param {boolean} isSub - 是否為子行程 (子行程不再展開自己的 subEvents)
 */
function generateTimelineNodeHtml(item, isPrint = false, isSub = false) {
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

    const subEvents = isSub ? [] : (item.subEvents || []).filter(sub => sub.visible !== false && sub.visible !== 'false');
    if (subEvents.length > 0) {
        html += `<div class="mt-2 border-l-2 border-slate-200">`;
        subEvents.forEach(subItem => {
            html += generateTimelineNodeHtml(subItem, isPrint, true);
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

/**
 * 打孔日曆 Icon。
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
