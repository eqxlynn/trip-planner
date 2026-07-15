/**
 * 🎨 產生單筆時間軸項目的 HTML 結構 (支援遞迴、網頁與列印共用)
 * @param {Object} item - 時間軸資料
 * @param {boolean} isPrint - 是否為列印模式 (用來控制圖片或外部連結)
 */
/**
 * 🎨 產生單筆時間軸項目的 HTML 結構 (支援遞迴、網頁與列印共用)
 */
/**
 * 🎨 產生單筆時間軸項目的 HTML 結構 (支援遞迴、網頁與列印共用)
 */
function generateTimelineNodeHtml(item, isPrint = false) {
    const timeVal = item.time || "";
    const eventVal = item.event || "";
    const descVal = item.desc || "";
    const theme = THEMES[window.currentTheme] || THEMES['grayscale'];

    const iconSize = "w-6 h-6 -left-3 top-1";
    const timeHtml = timeVal ? `<span class="inline-block whitespace-nowrap ui-title font-black tracking-widest px-2 py-0.5 rounded-md ${theme.timelineTime}" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">${timeVal}</span>` : '';

    const hasSubEvents = item.subEvents && item.subEvents.length > 0;

    // 1. 生成自身的節點 HTML
    let html = `
        <div class="relative mt-2 pl-8 pb-0 break-inside-avoid transition-all duration-300 hover:translate-x-0.5">
            <div class="absolute ${iconSize} rounded-full border-2 border-transparent flex items-center justify-center z-10 bg-white ${getEventBg(item.type)}" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">
                ${getEventIcon(item.type, item.icon)}
            </div>
            
            <div>
                <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    ${timeHtml}
                    <h3 class="ui-title text-slate-800">${eventVal}</h3>
                </div>
                <div class="text-sm text-slate-600 leading-relaxed">${parseMarkdownList(descVal, isPrint)}</div>
            </div>
    `;

    // 2. 遞迴處理子節點
    if (hasSubEvents) {
        html += `<div class="mt-2 border-l-2 border-slate-200">`;
        item.subEvents.forEach(subItem => {
            html += generateTimelineNodeHtml(subItem, isPrint);
        });
        html += `</div>`;
    }

    html += `</div>`;
    return html;
}

/**
 * 💡 產生單張 Tip/Metadata 卡片的 HTML 結構 (網頁與列印共用)
 * @param {Object} item - 卡片資料
 * @param {boolean} isPrint - 是否為列印模式
 */
function generateCardNodeHtml(item, isPrint = false) {
    const type = item.type || 'none';
    const titleVal = item.title || "";
    const descVal = item.desc || "";
    const style = getTypeConfig(type);
    const iconName = item.icon || style.defaultIcon || 'info';

    // 如果沒有標題與內容，回傳空外框 (保留版面)
    if (!titleVal && !descVal) {
        return `<div class="border ${style.box} print:!bg-transparent print:border-slate-200 p-2 rounded-xl break-inside-avoid w-full" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;"></div>`;
    }

    return `
        <!-- 💡 關鍵修正：加入 text-left 強制文字靠左，不受父容器影響；加入 w-full 讓卡片撐滿版面 -->
        <div class="text-left w-full rounded-xl p-2 border relative group break-inside-avoid print:!bg-transparent ${style.box}" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <!-- 標題與 Icon -->
            <div class="flex items-start items-center gap-2 mb-0">
                <i data-lucide="${iconName}" class="w-5 h-5 ${style.icon} shrink-0"></i>
                <h3 class="ui-title ${style.title} w-full">${titleVal}</h3>
            </div>
            <!-- 描述欄位 (縮排 pl-7 讓文字對齊標題) -->
            <div class="text-sm text-slate-600 leading-relaxed pl-7">
                ${parseMarkdownList(descVal, isPrint)}
            </div>
        </div>
    `;
}

function generateIndictoarNodeHtml(type, indictorText, icon) {
    const style = getTypeConfig(type);
    const iconName = icon || style.defaultIcon || 'bookmark';
    return `
    <div class="pt-0 mt-2" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">
        <div class="mt-4 mb-2 flex items-center gap-2 text-slate-700 font-bold break-inside-avoid" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <i data-lucide="${iconName}" class="w-5 h-5 ${style.icon} shrink-0"></i>
            <span class="tracking-widest text-sm">${indictorText}</span>
        </div>
    </div>
    `;
}

/**
 * 產生打孔日曆 Icon 的 HTML
 * @param {string} dateKey - 日期字串 YYYY-MM-DD
 * @param {number} dayNum - 動態計算出的天數 (1, 2, 3...)
 */
function generateCalendarIconHtml(dateInfo) {
    if (!dateInfo) return '';

    // 預設顏色主題
    let textClass = "text-slate-800";
    let borderClass = "border-slate-800";

    // 週末自動換色
    if (dateInfo.dowStr === "Sat") {
        textClass = "text-emerald-700";
        borderClass = "border-emerald-700";
    }
    if (dateInfo.dowStr === "Sun") {
        textClass = "text-rose-600";
        borderClass = "border-rose-600";
    }

    // 最外層加入 group 與 hover 特效
    return `
    <div class="relative w-[72px] h-[72px] shrink-0 mt-2 group transition-transform duration-200 hover:scale-105">
        
        <!-- 頂部鐵環 (加入 pointer-events-none 避免干擾點擊) -->
        <div class="absolute -top-2 left-0 w-full flex justify-evenly z-10 px-2 pointer-events-none">
            <div class="w-2 h-4 border-2 ${borderClass} rounded-full bg-white" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;"></div>
            <div class="w-2 h-4 border-2 ${borderClass} rounded-full bg-white" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;"></div>
            <div class="w-2 h-4 border-2 ${borderClass} rounded-full bg-white" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;"></div>
        </div>
        
        <!-- 日曆主體外框 -->
        <div class="absolute top-0 left-0 w-full h-full border-[2.5px] ${borderClass} rounded-xl bg-white flex flex-col justify-between py-1.5 px-1 shadow-sm" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <!-- 上方文字 (移除寬字距，調整為適合中文字的大小) -->
            <div class="text-[9px] font-bold text-center ${textClass} uppercase leading-none whitespace-nowrap overflow-hidden mt-0.5">
                ${dateInfo.startStr}
            </div>
            <!-- 中間大字 (稍微調整上下間距) -->
            <div class="flex-grow flex items-center justify-center -my-1">
                <span class="text-[28px] font-black ${textClass} leading-none">${dateInfo.mainStr}</span>
            </div>
            <!-- 下方文字 -->
            <div class="text-[9px] font-bold text-center ${textClass} uppercase leading-none whitespace-nowrap overflow-hidden mb-0.5">
                ${dateInfo.endStr}
            </div>
        </div>
               
        <!-- 🌟 修正：改用 opacity 漸變來做 Hover 遮罩，確保不與 display 屬性打架 -->
        <div class="edit-only-ui absolute inset-0 bg-slate-900/5 rounded-xl z-10 pointer-events-none flex items-center justify-center transition-opacity duration-200 opacity-0 group-hover:opacity-100">
            <i data-lucide="edit-2" class="w-5 h-5 text-slate-700 opacity-60"></i>
        </div>
    </div>
    `;
}

// 產生單日標題區塊 (可複用)
function generateDayHeader(item, dateInfo) {
    let hotelText = item.hotel ? item.hotel.replace(/^宿[\s:：]*/, '') : '';

    return `
        <div class="flex items-center py-0 break-inside-avoid">
    <div class="w-24 shrink-0 flex justify-center">
        ${generateCalendarIconHtml(dateInfo)}
    </div>
    
    <div class="flex-grow pl-1 pr-1 flex flex-col justify-center">
        
        <!-- 第一行：標題獨立一行，可以無限延伸不被壓縮 -->
        <div class="text-3xl font-bold text-slate-800 leading-tight py-2">
            ${item.title || ''}
        </div>
        
        <!-- 第二行：飯店與地區在同一行，左右排開平分空間 -->
        <div class="flex justify-between items-start gap-6">
            
            <!-- 左側：飯店 (給予 flex-grow 與 min-w-0 讓它有彈性且太長會截斷) -->
            <div class="flex-grow min-w-0">
                ${hotelText ? `
                <div class="text-sm font-medium text-slate-500 flex items-center">
                    <i data-lucide="bed" class="w-5 h-5 text-slate-400 shrink-0"></i>
                    <span class="truncate">${hotelText}</span>
                </div>
                ` : ''}
            </div>
            
            <!-- 右側：地區 (設定 max-w-[50%] 確保它最多只跟飯店平分一半空間) -->
            ${item.region ? `<div class="text-sm text-slate-500 text-right shrink-0 max-w-[50%]">${item.region}</div>` : ''}
            
        </div>
    </div>
</div>`;
}
