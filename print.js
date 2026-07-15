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
// 1. 設定測量沙盒為完整的 A4 寬度 (210mm)
function getPageSandbox() {
    let sandbox = document.getElementById('print-measure-sandbox');
    if (!sandbox) {
        sandbox = document.createElement('div');
        sandbox.id = 'print-measure-sandbox';

        // 💡 這裡將寬度嚴格設定為 A4 的 210mm 
        // padding: 20px 需與你實際 print-container 內頁的左右留白一致，以求測量精準
        sandbox.style.cssText = 'width: 210mm; position: absolute; left: -9999px; visibility: hidden;';
        document.body.appendChild(sandbox);
    }
    return sandbox;
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
        .filter(item => item.event || item.desc || item.time);

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
    // ✨ 如果提示卡片有內容，將「重點筆記標題」加到陣列的最前面
    if (tipsItems.length > 0) {
        tipsItems.unshift(generateIndictoarNodeHtml("important", "重點筆記"));
    }

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
        <div class="p-10 text-center flex flex-col items-center print-page-break break-after-page" style="min-height: 270mm; padding-top: 50mm;">
            <h1 class="text-5xl font-black mb-4 text-slate-900 tracking-wide">${metadata.title || ''}</h1>
            <h2 class="text-xl font-bold text-slate-500 tracking-widest mb-16">${metadata.subtitle || ''}</h2>
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

function generateBookletContent() {
    try {
        // 🛡️ 防呆：確保資料存在
        if (!window.tripData) {
            console.warn("列印失敗：找不到 tripData 或 detail 結構");
            return;
        }
        // 建立一個陣列來收集「所有的獨立單頁 HTML」
        const pagesArray = [];
        const printContainer = document.getElementById('print-container');
        const metadata = window.tripData.metadata || {};

        // ==========================================
        // 第一頁：產生封面 (Cover)
        // ==========================================
        //pagesArray.push(generateEmpty());
        pagesArray.push(generateCover(metadata));

        if (window.tripData.detail) {
            const dayKeys = Object.keys(window.tripData.detail);
            pagesArray.push(generateOverviewTable(dayKeys));

            const sandbox = getPageSandbox();

            // ==========================================
            // 💡 這裡改為 A4 專用的最大高度限制
            // A4 實體高度為 297mm (約 1122px)。
            // 扣除預設的上下邊距 (Margin)，抓 1000 ~ 1050 是最安全的 A4 單頁滿載高度
            // ==========================================
            const MAX_PAGE_HEIGHT_PX = 1000;

            dayKeys.forEach((key, index) => {
                const day = window.tripData.detail[key];
                if (!day) return;

                const dayNum = index + 1;
                const dateInfo = getDateDisplayInfo(key);

                // 拆解出 Timeline HTML 陣列
                const timelineItems = (day.timeline || [])
                    .filter(item => item.visible !== "false")
                    .filter(item => item.event || item.desc || item.time) // 💡 補上這行過濾
                    .map((item, i, arr) => {
                        // 💡 原本這裡的 if (!item.event && !item.desc...) return ''; 已經被上面的 filter 取代，直接刪除！

                        const iconBg = getEventBg(item.type);
                        const iconSvg = getIcon(item.type, item.icon);
                        const timeBadge = item.time ? `<span class="inline-block whitespace-nowrap text-xl font-bold px-3 py-1.5 rounded-md text-slate-600 bg-slate-100 print:bg-slate-100" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">${item.time}</span>` : '';

                        // 💡 確保使用 arr.length
                        const isLastItem = i === arr.length - 1;

                        return `
                            <div class="relative pl-14 pb-3 break-inside-avoid timeline-item">
                                ${!isLastItem ? `<div class="absolute left-4 top-8 bottom-0 w-[2px] bg-slate-200" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;"></div>` : ''}
                                <div class="absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center ${iconBg} z-10" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">
                                    ${iconSvg}
                                </div>
                                <div>
                                    <div class="flex items-center flex-wrap gap-y-1 mb-0">
                                        ${timeBadge}
                                        <h3 class="font-bold text-2xl text-slate-800">${item.event || ''}</h3>
                                    </div>
                                    <div class="text-slate-600 mt-0">${parseMarkdownList(item.desc, true)}</div>
                                </div>
                            </div>
                        `;
                    });

                // 拆解出 Tips HTML 陣列
                const tipsHtml = day.tips && day.tips.length > 0
                    ? `<div class="grid grid-cols-2 gap-4 mb-0">${day.tips.map(tip => generateCard(tip)).join('')}</div>`
                    : '';

                // 開始動態組裝頁面
                let currentPageHtml = generateDayHeader(day, dateInfo);
                sandbox.innerHTML = currentPageHtml;

                // 逐一測試行程區塊
                timelineItems.forEach((itemHtml) => {
                    sandbox.innerHTML += itemHtml;

                    // 如果塞入這個區塊後超過了頁面高度
                    if (sandbox.offsetHeight > MAX_PAGE_HEIGHT_PX) {
                        // 1. 將「原本沒超標的內容」推進頁面陣列
                        pagesArray.push(`<div class="break-before-page print-page-break">${currentPageHtml}</div>`);

                        // 2. 開啟新的一頁 (加上續的標題)，並把剛剛超標的區塊塞進去
                        currentPageHtml = generateDayHeader(day, dateInfo) + itemHtml;
                        sandbox.innerHTML = currentPageHtml; // 重置沙盒進行下一輪測量
                    } else {
                        // 沒超標，就正式加入當前頁面
                        currentPageHtml += itemHtml;
                    }
                });

                // 測試 Tips 區塊
                if (tipsHtml) {
                    sandbox.innerHTML += tipsHtml;
                    if (sandbox.offsetHeight > MAX_PAGE_HEIGHT_PX) {
                        pagesArray.push(`<div class="break-before-page print-page-break">${currentPageHtml}</div>`);
                        currentPageHtml = generateDayHeader(day, dateInfo) + tipsHtml;
                    } else {
                        currentPageHtml += tipsHtml;
                    }
                }

                // 迴圈結束後，將最後剩下的一頁推進去
                if (currentPageHtml) {
                    pagesArray.push(`<div class="break-before-page print-page-break border-b-0">${currentPageHtml}</div>`);
                }
            });

            // 清理沙盒
            sandbox.innerHTML = '';
        }

        // ==========================================
        // 🎯 核心拼版邏輯 (Imposition)：處理雙面列印對摺
        // ==========================================

        // 1. 小冊子的總頁數必須是 4 的倍數，不足的話自動補上「空白筆記頁」
        while (pagesArray.length % 4 !== 0) {
            pagesArray.push(generateEmpty());
        }

        const totalPages = pagesArray.length;
        const totalSheets = totalPages / 4; // 算出需要幾張 A4 紙
        let finalSpreadHtml = ''

        for (let i = 0; i < totalSheets; i++) {
            // 第一面 (紙張正面) -> 左：封底方向，右：封面方向
            const frontLeft = pagesArray[totalPages - 1 - 2 * i];
            const frontRight = pagesArray[0 + 2 * i];

            finalSpreadHtml += `
                ${frontLeft}
                ${frontRight}
            `;

            // 第二面 (紙張背面) -> 左：封面後面的內頁，右：封底前面的內頁
            const backLeft = pagesArray[1 + 2 * i];
            const backRight = pagesArray[totalPages - 2 - 2 * i];

            finalSpreadHtml += `
                ${backLeft}
                ${backRight}
            `;
        }

        // 寫入 DOM 並啟動 Icon 渲染
        printContainer.innerHTML = finalSpreadHtml;
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
