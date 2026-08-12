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
    <div class="print-page-break break-after-page">
        <div class="mb-2">
            <h1 class="text-4xl font-black text-slate-900">${meta.title || '行程總覽'}</h1>
            ${meta.subtitle ? `<div class="text-sm font-bold text-slate-500 mt-1">${meta.subtitle}</div>` : ''}
        </div>
        <div class="flex flex-col pt-1 gap-4">
    `;

    // 💡 修正 1：加入 index 以計算天數
    dayKeys.forEach((key, index) => {
        const day = window.tripData.detail[key];
        if (!day) return;

        html += generateDayHeader(day, getDateDisplayInfo(key));
    });

    html += `</div></div>`;
    return html;
}

function getIcon(type, customIcon) {
    const config = getTypeConfig(type);
    const finalIcon = customIcon || config.defaultIcon;

    // 讀取設定檔的 icon 屬性 (例如: 'text-amber-600')
    return `<i data-lucide="${finalIcon}" class="w-6 h-6 ${config.icon}"></i>`;
}

function generateCard(item) {
    const style = getTypeConfig(item.type);
    const iconName = item.icon || style.defaultIcon;

    if (!item.title && !item.desc) return `
        <div class="border ${style.box} print:!bg-transparent p-4 rounded-lg break-inside-avoid" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">
        </div>`;

    return `
        <!-- 💡 加上 print:!bg-transparent 強制去背 -->
        <div class="border ${style.box} print:!bg-transparent p-4 rounded-lg break-inside-avoid text-left w-full" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <div class="flex items-start gap-1">
                <i data-lucide="${iconName}" class="w-5 h-5 ${style.icon} shrink-0 mb-1"></i>
                <h3 class="ui-title ${style.title}">${item.title}</h3>
            </div>
            <div class="mt-1">
                ${parseMarkdownList(item.desc, true)}
            </div>
        </div>
    `
}

/**
 * 產生單日列印用的 HTML 結構
 * @param {Object} day - 單日行程資料
 * @param {string} dateKey - 日期字串 (YYYY-MM-DD)
 * @param {number} dayNum - 第幾天
 * @returns {string} 組合完成的 HTML 字串
 */
function generateTopic(day, dateKey, dayNum) {
    if (!day) return '';

    // ✨ 1. 先取得過濾後的真實陣列
    const timelineRaw = (day.timeline || [])
        .filter(item => item.visible !== "false")
        .filter(item => item.event || item.title || item.desc || item.time);

    // ✨ 2. 進行 Map 渲染，並傳遞 isLast 狀態
    const timelineItems = timelineRaw.map((item, index) => {
        const isLast = index === timelineRaw.length - 1;
        return `<div class="relative ml-2 border-l-2 border-slate-200">${generateTimelineNodeHtml(item, true, isLast)}</div>`;
    });
    
    // ✨ 3. 如果時間軸有內容，將「時間軸標題」加到陣列的最前面
    if (timelineItems.length > 0) {
        timelineItems.unshift(generateIndictoarNodeHtml("timeline", "重大事件"));
    }
    
    const tipsItems = (day.tips || [])
        .filter(item => item.visible !== "false")
        .filter(item => item.title || item.desc)
        .map(item => generateCardNodeHtml(item, true));

    // 3. 處理區域 (Region) 標籤
    const regionBadge = day.region
        ? `<span class="inline-block bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-sm font-bold shrink-0" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">${day.region}</span>`
        : '';

    // 💡 修正 4：利用外部傳入的 dateKey 動態計算出完美的日期顯示 (例如：Mon, Nov 10)
    const dateInfo = getDateDisplayInfo(dateKey);

    // 4. 回傳完整單日版面
    return `
        <div class="break-before-page print-page-break">
            ${generateDayHeader(day, dateInfo)}
            ${timelineItems.join('')}
            ${(tipsItems.length > 0)? generateIndictoarNodeHtml("important", "重點筆記"): ''}
            <div class="grid grid-cols-2 gap-2">${tipsItems.join('')}</div>
        </div>
    `;
}

function generateCover(metadata) {
    let guidesHtml = '';

    // 🛡️ 防呆：確保 guides 存在且是陣列，才進行處理
    if (metadata.guides && metadata.guides.length > 0) {
        guidesHtml = metadata.guides.map(guide => generateCardNodeHtml(guide, true)).join('');
    }
    return `
        <div class="p-10 text-center flex flex-col items-center print-page-break break-after-page" style="min-height: 270mm; padding-top: 20mm;">
            <h1 class="text-5xl font-black mb-4 text-slate-900 tracking-wide">${metadata.title || ''}</h1>
            <h2 class="text-xl font-bold text-slate-500 tracking-widest mb-8">${metadata.subtitle || ''}</h2>
            <div class="w-full grid grid-cols-1 gap-2 ">${guidesHtml}</div>
        </div>
    `;
}

function generateEmpty() {
    return `
        <div class="break-before-page print-page-break p-2 flex flex-col items-center justify-center" style="min-height: 270mm;">
            <div class="flex flex-col items-center justify-center text-slate-300">
                <i data-lucide="book-open" class="w-8 h-8 mb-2 opacity-50"></i>
                <div class="text-[10px] tracking-widest uppercase font-bold">TRIP PLANNER</div>
            </div>
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
        let htmlContent = generateCover(metadata);

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
                htmlContent += generateTopic(day, key, dayNum);
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

