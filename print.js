// print.js
// ==========================================
// 🖨️ 旅遊手冊列印引擎 (Print Mode)
// ==========================================

/**
 * 產生「行程總覽」列表（使用共用日曆 Icon）
 */
function generateOverviewTable(dayKeys) {
    if (!dayKeys || dayKeys.length === 0 || !window.tripData || !window.tripData.detail) return '';

    const meta = window.tripData.metadata || {};
    let html = `
    <div class="print-page-break break-after-page p-4">
        <div class="mb-2">
            <h1 class="text-2xl font-black text-slate-900">${meta.title || '行程總覽'}</h1>
            ${meta.subtitle ? `<div class="text-sm font-bold text-slate-500 mt-1">${meta.subtitle}</div>` : ''}
        </div>
        <div class="flex flex-col">
    `;

    // 💡 修正 1：加入 index 以計算天數
    dayKeys.forEach((key, index) => {
        const day = window.tripData.detail[key];
        if (!day) return;
        
        const dayNum = index + 1;
        let hotelText = day.hotel ? day.hotel.replace(/^宿[\s:：]*/, '') : '';
        let regionText = day.region || '';

        html += `
            <div class="flex items-center py-2 break-inside-avoid">
                
                <!-- 💡 修正 2：傳入 key (日期字串) 與 dayNum (天數) -->
                <div class="w-24 shrink-0 flex justify-center">
                    ${generateCalendarIconHtml(key, dayNum)}
                </div>
                
                <!-- 右側：標題、住宿與地區 -->
                <div class="flex-grow pl-1 pr-1">
                    <div class="flex justify-between items-center gap-6">
                        <div class="flex-grow">
                            <div class="text-[17px] font-bold text-slate-800 leading-snug">${day.title || ''}</div>
                            ${hotelText ? `
                            <div class="text-[13px] font-medium text-slate-500 flex items-center gap-1.5 mt-1.5">
                                <i data-lucide="bed" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
                                <span>${hotelText}</span>
                            </div>
                            ` : ''}
                        </div>
                        ${regionText ? `<div class="text-[13px] text-slate-500 text-right shrink-0 w-1/2 leading-relaxed">${regionText}</div>` : ''}
                    </div>
                </div>
                
            </div>
        `;
    });

    html += `</div></div>`;
    return html;
}

/**
 * 產生單日列印用的 HTML 結構
 * @param {Object} day - 單日行程資料
 * @param {string} dateKey - 日期字串 (YYYY-MM-DD)
 * @param {number} dayNum - 第幾天
 * @returns {string} 組合完成的 HTML 字串
 */
function generatePrintDay(day, dateKey, dayNum) {
    if (!day) return '';

    // 1. 產生精密齒輪時間軸
    const timeline = day.timeline || [];
    const timelineHtml = timeline
        .filter(item => item.visible !== "false") 
        .map((item, i) => {
        const iconBg = getEventBg(item.type); 
        const iconSvg = getEventIcon(item.type, item.icon);
        const timeBadge = item.time 
            ? `<span class="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-bold mr-3" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">${item.time}</span>` 
            : '';
        const isLastItem = i === timeline.length - 1;

        return `
            <div class="relative pl-14 pb-3 break-inside-avoid">
                ${!isLastItem ? `<div class="absolute left-4 top-8 bottom-0 w-[2px] bg-slate-200" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;"></div>` : ''}
                <div class="absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center ${iconBg} z-10" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    ${iconSvg}
                </div>
                <div>
                    <div class="flex items-center flex-wrap gap-y-2 mb-2">
                        ${timeBadge}
                        <h4 class="font-bold text-lg text-slate-800">${item.event || '未命名行程'}</h4>
                    </div>
                    <div class="text-slate-600 mt-1">
                        ${parseMarkdownList(item.desc, true)}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // 2. 產生 Tips 提示卡區塊
    let tipsHtml = '';
    const tips = day.tips || [];
    if (tips.length > 0) {
        const tipsCards = tips.map(tip => {
            const style = getTypeConfig(tip.type);
            const iconName = tip.icon || style.defaultIcon;
            
            if (!tip.title) return `
            <div class="border ${style.box} print:!bg-transparent p-4 rounded-lg break-inside-avoid" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">
            </div>`;
            
            return `
            <!-- 💡 加上 print:!bg-transparent 強制去背 -->
            <div class="border ${style.box} print:!bg-transparent p-4 rounded-lg break-inside-avoid" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">
                <div class="flex items-start gap-2 mb-2">
                    <i data-lucide="${iconName}" class="w-5 h-5 ${style.icon} shrink-0 mt-0.5"></i>
                    <h4 class="font-bold text-sm ${style.title} leading-snug">${tip.title}</h4>
                </div>
                <div class="mt-1">
                    ${parseMarkdownList(tip.desc, true)}
                </div>
            </div>
        `}).join('');
        tipsHtml = `<div class="grid grid-cols-2 gap-4 mb-8">${tipsCards}</div>`;
    }
    
    // 3. 處理區域 (Region) 標籤
    const regionBadge = day.region 
        ? `<span class="inline-block bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-sm font-bold shrink-0" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">${day.region}</span>` 
        : '';
        
    // 💡 修正 4：利用外部傳入的 dateKey 動態計算出完美的日期顯示 (例如：Mon, Nov 10)
    const dateInfo = getDateDisplayInfo(dateKey);

    // 4. 回傳完整單日版面
    return `
        <div class="break-before-page print-page-break p-2">
            <div class="border-b-2 border-slate-800 pb-2 mb-4">
                <span class="text-sm font-black text-slate-400">DAY ${dayNum} - ${dateInfo.full}</span>
                <div class="flex justify-between items-end mt-1 mb-3">
                    <h2 class="text-3xl font-black text-slate-900">${day.title || ''}</h2>
                    ${regionBadge}
                </div>
                
            </div>
            ${timelineHtml}
            ${tipsHtml}
        </div>
    `;
}

// 1. 將「產生列印畫面」的邏輯獨立出來
function generatePrintContent() {
    try {
        // 🛡️ 防呆：確保資料存在
        if (!window.tripData) {
            console.warn("列印失敗：找不到 tripData 或 detail 結構");
            return;
        }
        
        const printContainer = document.getElementById('print-container');
        const metadata = window.tripData.metadata || {}; 
        
        // ==========================================
        // 第一頁：產生封面 (Cover)
        // ==========================================
        let htmlContent = `
            <div class="p-10 text-center flex flex-col items-center print-page-break break-after-page" style="min-height: 270mm; padding-top: 50mm;">
                <h1 class="text-5xl font-black mb-4 text-slate-900 tracking-wide">${metadata.title || '無標題行程'}</h1>
                <h2 class="text-xl font-bold text-slate-500 tracking-widest mb-16">${metadata.subtitle || ''}</h2>
                
                ${metadata.guides && metadata.guides.length > 0 ? `
                <div class="border-t border-slate-300 pt-12 mt-4 w-11/12 flex flex-wrap justify-center items-start gap-x-12 gap-y-10">
                    ${metadata.guides.map(guide => {
                        // 💡 讀取全域樣式設定 (與網頁版同步)
                        const style = getTypeConfig(guide.type);
                        const iconName = guide.icon || style.defaultIcon;
                        return `
                        <div class="flex flex-col items-center">
                            <div class="w-fit max-w-[320px]"> 
                                <!-- 帶有 Icon 與專屬顏色的 Guide 標題 -->
                                <h3 class="text-[17px] font-black mb-3 ${style.title} text-center tracking-widest flex items-center justify-center gap-2">
                                    <i data-lucide="${iconName}" class="w-5 h-5 ${style.icon} shrink-0"></i>
                                    <span>${guide.title || ''}</span>
                                </h3>
                                <!-- 解析 Markdown 的內容區 -->
                                <div class="text-left text-[13.5px] text-slate-600 font-medium">
                                    ${parseMarkdownList(guide.desc, true)}
                                </div>
                            </div>
                        </div>
                    `}).join('')}
                </div>
                ` : ''}
            </div>
        `;
        if (window.tripData.detail) {
            const dayKeys = Object.keys(window.tripData.detail);
            // ==========================================
            // 第二頁：產生目錄與行程總覽 (TOC)
            // ==========================================
            htmlContent += generateOverviewTable(dayKeys); 

            // ==========================================
            // 第三頁起：產生每一天的行程內頁
            // ==========================================
            dayKeys.forEach((key, index) => {
                const day = window.tripData.detail[key];
                if (!day) return;
                
                const dayNum = index + 1;
                // ✨ 正確傳遞 day 資料、日期字串 (key) 以及第幾天 (dayNum)
                htmlContent += generatePrintDay(day, key, dayNum);
            });
        }
        // 寫入 DOM 並啟動 Icon 渲染
        printContainer.innerHTML = htmlContent;
        initIcons(printContainer);
        
    } catch (error) {
        console.error("列印模組發生錯誤:", error);
        document.getElementById('print-container').innerHTML = `
            <div class="p-10 text-center text-red-600 font-bold">
                <h2 class="text-2xl mb-2">列印畫面生成失敗 😢</h2>
                <p class="text-sm text-red-500">${error.message}</p>
            </div>
        `;
    }
}

// 4. 點擊網頁按鈕時，直接呼叫瀏覽器原生列印即可
window.printItinerary = function() {
    window.print();
};
