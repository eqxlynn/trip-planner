// ==========================================
// 🛠️ 核心函式
// ==========================================

// 限制 Lucide Icon 掃描的 DOM 範圍，避免全域掃描拖慢速度
function initIcons(rootElement = document.body) {
    if (window.lucide) {
        window.lucide.createIcons({ root: rootElement });
    }
}

// 取得時間軸背景色
function getEventBg(type) {
    // 讀取設定檔的 box 屬性 (例如: 'bg-amber-50 border-amber-200')
    return getTypeConfig(type).box; 
}

// 取得時間軸 Icon HTML
function getEventIcon(type, customIcon) {
    const config = getTypeConfig(type);
    const finalIcon = customIcon || config.defaultIcon;
    
    // 讀取設定檔的 icon 屬性 (例如: 'text-amber-600')
    return `<i data-lucide="${finalIcon}" class="w-4 h-4 ${config.icon}"></i>`;
}

// ==========================================
// 📊 介面渲染邏輯
// ==========================================

/**
 * 透過 yyyy-mm-dd 計算並格式化日期與星期
 * @param {string} dateString - 格式為 "YYYY-MM-DD"
 */
function getDateDisplayInfo(dateString) {
    const d = new Date(dateString);
    // 萬一格式錯誤的防呆處理
    if (isNaN(d.getTime())) return { monthStr: "???", dayStr: "??", dowStr: "???", full: dateString };
    
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    return {
        monthStr: months[d.getMonth()],
        dayStr: d.getDate().toString(),
        dowStr: days[d.getDay()],
        // 組合出供左側選單使用的完整字串，例如 "Nov 10 (Tue)"
        full: `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}` 
    };
}

function getTypeConfig(type) {
    return TYPE_CONFIG[type] || TYPE_CONFIG['none'];
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
        <div class="absolute top-0 left-0 w-full h-full border-[2.5px] ${borderClass} rounded-xl bg-white flex flex-col justify-between py-1.5 px-1.5 shadow-sm" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <div class="text-[10px] font-black text-center ${textClass} uppercase tracking-widest leading-none whitespace-nowrap overflow-hidden mt-0.5">
                ${dateInfo.monthStr}
            </div>
            <div class="flex-grow flex items-center justify-center">
                <span class="text-[28px] font-black ${textClass} leading-none">${dateInfo.dayStr}</span>
            </div>
            <div class="text-[8px] font-bold text-center ${textClass} uppercase tracking-widest leading-none whitespace-nowrap overflow-hidden mb-0.5">
                ${dateInfo.dowStr}
            </div>
        </div>

        <!-- 🌟 修正：移除 hidden，並加入 onclick="this.showPicker()" 強制喚醒日曆 -->
        <input type="date" value="${dateInfo.full}" 
               class="edit-only-ui absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
               onclick="this.showPicker()"
               onchange="window.changeDayDate('${dateInfo.full}', this.value)"
               title="點擊修改日期">
               
        <!-- 🌟 修正：改用 opacity 漸變來做 Hover 遮罩，確保不與 display 屬性打架 -->
        <div class="edit-only-ui absolute inset-0 bg-slate-900/5 rounded-xl z-10 pointer-events-none flex items-center justify-center transition-opacity duration-200 opacity-0 group-hover:opacity-100">
            <i data-lucide="edit-2" class="w-5 h-5 text-slate-700 opacity-60"></i>
        </div>
    </div>
    `;
}

function renderSharedCards(containerId, itemsArray, generateDataAttributes) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!itemsArray || itemsArray.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = itemsArray.map((item, index) => {
        const type = item.type || 'none';
        const titleVal = item.title || "";
        const descVal = item.desc || "";

        // 取得樣式
        const style = (isPlannerEditMode && type === 'transparent') ? getTypeConfig('none') : getTypeConfig(type);
        const iconName = item.icon || style.defaultIcon || 'info';

        // 🎯 關鍵修改：直接呼叫外面傳進來的函式，並把 index 傳給它
        const dataAttributes = typeof generateDataAttributes === 'function' 
            ? generateDataAttributes(index) 
            : "";

        const cardTypes = Object.keys(TYPE_CONFIG);
        const typeOptionsHtml = cardTypes.map(t => 
            `<option value="${t}" ${t === type ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`
        ).join('');
        return `
            <div class="rounded-xl p-2 border relative group print:bg-transparent ${style.box}">
                <!-- 標題與 Icon -->
                <div class="flex items-start gap-2 mb-2">
                    <i data-lucide="${iconName}" class="w-5 h-5 ${style.icon} shrink-0 mt-0.5"></i>
                    <h3 class="ui-title ${style.title ? style.title: ''} editable-element w-full" 
                        ${dataAttributes} 
                        data-edit-field="title" 
                        data-placeholder="新增標題">${titleVal}</h3>
                </div>
                
                <!-- 編輯模式專屬：Type 下拉選單 -->
                <div class="edit-only-ui flex items-center gap-2 mb-2 text-xs text-slate-500 hidden">
                    <i data-lucide="tag" class="w-3 h-3"></i>
                    <select class="bg-transparent border-b border-slate-300 focus:outline-none focus:border-emerald-500 pb-0.5 cursor-pointer"
                        ${dataAttributes} 
                        data-edit-field="type"
                        onchange="handleTypeChange(this)">
                        ${typeOptionsHtml} <!-- ✅ 這裡替換成迴圈產生出來的字串 -->
                    </select>
                </div>

                <!-- 描述欄位 -->
                <div class="editable-element text-sm text-slate-600 mt-0" 
                     ${dataAttributes} 
                     data-edit-field="desc" 
                     data-placeholder="新增詳細內容...">${parseMarkdownList(descVal)}</div>
            </div>
        `;
    }).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
    
    // 如果目前正在編輯模式中，動態掛載編輯屬性與顯示下拉選單
    if (typeof isPlannerEditMode !== 'undefined' && isPlannerEditMode) {
        const editables = container.querySelectorAll('.editable-element');
        editables.forEach(el => {
            el.setAttribute('contenteditable', 'true');
            el.classList.add('hover:bg-slate-100', 'transition-colors', 'rounded', 'cursor-text', 'focus:outline-none', 'focus:ring-2', 'focus:ring-emerald-500/50');
        });
        const editOnlyUis = container.querySelectorAll('.edit-only-ui');
        editOnlyUis.forEach(el => el.classList.replace('hidden', 'flex'));
    }
}

// 切換天數控制引擎
function switchDay(dayId) {
    localStorage.setItem('active-day', dayId);
    const data = window.tripData.detail[dayId];
    if (!data) return;
    
    const theme = THEMES[window.currentTheme];

    // 1. 更新左側日程選單按鈕的色調 (過濾跳過 metadata 節點)
    Object.keys(window.tripData.detail).forEach(key => {
        if (key === 'metadata') return; // 跳過非天數數據
        const btn = document.getElementById(`nav-day-${key}`);
        if (!btn) return;
        const badge = btn.querySelector('.day-badge');
        const dateTxt = btn.querySelector('.day-date-txt');
        const titleTxt = btn.querySelector('.day-title-txt');

        if (key === dayId) {
            btn.className = `snap-start flex-shrink-0 flex items-center lg:w-full space-x-3 px-4 py-3 rounded-xl border text-left transition-all duration-300 font-bold ${theme.selectedDay}`;
            badge.className = `day-badge w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${theme.selectedBadge}`;
            if(dateTxt) dateTxt.className = "day-date-txt font-bold text-xs truncate text-white";
            if(titleTxt) titleTxt.className = "day-title-txt text-[10px] text-white/95 truncate mt-0.5 font-medium flex items-center gap-1";
        } else {
            btn.className = `snap-start flex-shrink-0 flex items-center lg:w-full space-x-3 px-4 py-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200 text-slate-700 text-left transition-all duration-300`;
            badge.className = `day-badge w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs bg-slate-100 text-slate-500`;
            if(dateTxt) dateTxt.className = "day-date-txt font-bold text-xs truncate text-slate-800";
            if(titleTxt) titleTxt.className = "day-title-txt text-[10px] text-slate-400 truncate mt-0.5 flex items-center gap-1";
        }
    });

    // 2. 渲染中間主內容區 header
    
    // 💡 取得所有日期，排序後找出目前這個 dayId 是第幾天
    const sortedKeys = Object.keys(window.tripData.detail)
        .filter(k => k !== 'metadata')
        .sort((a, b) => new Date(a) - new Date(b));
    const dynamicDayNum = sortedKeys.indexOf(dayId) + 1;

    // 寫入左側：打孔日曆 Icon (傳入 YYYY-MM-DD 與動態天數)
    const calendarContainer = document.getElementById('detail-calendar-icon-container');
    if (calendarContainer) {
        calendarContainer.innerHTML = generateCalendarIconHtml(getDateDisplayInfo(dayId));
    }
    
    // 寫入右側：主標題
    const detailTitle = document.getElementById('detail-title');
    if (detailTitle) {
        detailTitle.textContent = data.title || '';
        // ✏️ 新增：標記主標題為可編輯
        detailTitle.classList.add('editable-element');
        detailTitle.dataset.editDay = dayId;
        detailTitle.dataset.editField = 'title';
    }

    // 動態填寫日期編輯框
    const dayDateDisplay = document.getElementById('day-date-display');
    if (dayDateDisplay) {
        dayDateDisplay.innerHTML = ``;
    }
    
    // 控制標題下方的地區標籤顯示狀態
    const badgeContainer = document.getElementById('detail-badge-container');
    const badge = document.getElementById('detail-badge');
    const regionTxt = document.getElementById('detail-region-txt');

    if (data.region) {
        if (badgeContainer) badgeContainer.classList.remove('hidden'); 
        if (badge) badge.className = `inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-md transition-colors duration-300 ${theme.detailBadge}`;
        if (regionTxt) {
            regionTxt.textContent = data.region;
            // ✏️ 新增：標記地區為可編輯
            regionTxt.classList.add('editable-element');
            regionTxt.dataset.editDay = dayId;
            regionTxt.dataset.editField = 'region';
        }
    } else {
        if (badgeContainer) badgeContainer.classList.add('hidden'); 
    }

    // 4. 動態生成提示卡 (Tips)
    const tipsContainer = document.getElementById('tips-container');
    if (tipsContainer) {
        let tips = data.tips || [];
        // 👇 直接呼叫共用函式
        renderSharedCards('tips-container', tips, (index) => `data-edit-day="${dayId}" data-edit-tip-index="${index}"`);
    }

    // 5. 渲染精密齒輪時間軸
    const timelineContainer = document.getElementById('detail-timeline');
    timelineContainer.innerHTML = ''; // 清空舊內容

    let dailyTotal = 0;
    const categoryTotals = {}; 
    
    // ✏️ 新增：加入 index 參數，以便知道目前正在編輯哪一筆
    data.timeline.forEach((item, index) => { 
        const amount = parseFloat(item.amount) || 0; 
        dailyTotal += amount;
        if (item.type && amount > 0) {
            categoryTotals[item.type] = (categoryTotals[item.type] || 0) + amount;
        }
        const el = document.createElement('div');
        el.className = 'relative pl-8 transition-all duration-300 hover:translate-x-0.5';

        // 💡 確保所有欄位都有預設值，讓編輯模式下能點擊修改
        const timeVal = item.time || "";
        const eventVal = item.event || "";
        const descVal = item.desc || "";
        const typeVal = item.type || "none";
        const amountVal = item.amount || 0;

        // 👇 新增：建立 Type 下拉選單的選項
        const typeOptionsList = Object.keys(TYPE_CONFIG);
        const typeOptions = typeOptionsList.map(t => 
            `<option value="${t}" ${t === typeVal ? 'selected' : ''}>${t}</option>`
        ).join('');

        // 強制產生 time 標籤
        const timeHtml = `<span class="whitespace-nowrap text-xs font-black tracking-widest px-2 py-0.5 rounded-md w-max ${theme.timelineTime} editable-element" data-edit-day="${dayId}" data-edit-index="${index}" data-edit-field="time" data-placeholder="新增時間">${timeVal}</span>`;

        el.innerHTML = `
            <div id="timeline-icon-${dayId}-${index}" class="absolute -left-3 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-sm z-10 transition-transform duration-300 hover:scale-110 ${getEventBg(item.type)}">
                ${getEventIcon(item.type, item.icon)}
            </div>
            <div>
                <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1">
                    ${timeHtml}
                    <h3 class="ui-title text-slate-800 editable-element" data-edit-day="${dayId}" data-edit-index="${index}" data-edit-field="event" data-placeholder="新增標題">${eventVal}</h3>
                </div>
    
                <!-- 🌟 編輯模式專屬 UI 區塊：Type 下拉與金額 (改用 Tips 簡約風格) -->
                <div class="flex flex-wrap gap-4 mt-2">
                    
                    <!-- 1. Type 下拉選單 (Tips style) -->
                    <div class="edit-only-ui hidden flex items-center gap-2 text-xs text-slate-500">
                        <i data-lucide="tag" class="w-3 h-3 shrink-0"></i>
                        <select class="bg-transparent border-b border-slate-300 focus:outline-none focus:border-emerald-500 pb-0.5 cursor-pointer font-medium text-slate-700" 
                                data-edit-day="${dayId}" 
                                data-edit-index="${index}" 
                                data-edit-field="type" 
                                onchange="handleTypeChange(this)">
                            ${typeOptions}
                        </select>
                    </div>

                    <!-- 2. Amount 金額輸入框 (同步套用 Tips 簡約底線風格) -->
                    <div class="edit-only-ui hidden flex items-center gap-2 text-xs text-slate-500">
                        <i data-lucide="dollar-sign" class="w-3 h-3 shrink-0"></i>
                        <span class="editable-element border-b border-slate-300 focus:outline-none focus:border-emerald-500 pb-0.5 min-w-[2em] font-medium text-slate-700 placeholder:text-slate-400" 
                            data-edit-day="${dayId}" 
                            data-edit-index="${index}" 
                            data-edit-field="amount">${amountVal}</span>
                    </div>
                    
                </div>

                <!-- 描述欄位 -->
                <div class="editable-element mt-0" data-edit-day="${dayId}" data-edit-index="${index}" data-edit-field="desc" data-placeholder="點擊新增描述...">${parseMarkdownList(descVal)}</div>
            </div>
        `;
        timelineContainer.appendChild(el);
    });

    // 只掃描中間主內容區，避免全域掃描
    initIcons(document.getElementById('main-content-section'));

    // UX 優化：手機版切換天數時，自動滾動回內容頂部
    if (window.innerWidth < 1024) {
        document.getElementById('detail-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// 核心啟動函式
function loadFail(fileLoadedName) {
    const dataStatusTxt = document.getElementById('data-status-txt');
    const fallbackWarning = document.getElementById('fallback-warning');
    const fallbackReasonText = document.getElementById('fallback-reason-text');

    // 1. 處理數據檔載入失敗的 Fallback 邏輯
    if (!tripSuccess || !window.tripData) {
        if(fallbackWarning) fallbackWarning.classList.remove('hidden');
        if(fallbackReasonText) fallbackReasonText.innerHTML = `無法讀取到行程數據 <strong>${fileLoadedName}</strong>。<br>請確認該檔案與網頁置於同個資料夾中，或者檢查網址 query 參數是否正確。`;
        const detailTitle = document.getElementById('detail-title');
        if(detailTitle) detailTitle.textContent = "數據檔載入失敗";
        if(dataStatusTxt) dataStatusTxt.textContent = "狀態：載入失敗";
        initIcons();
    }
}

function render() {
    // const savedTheme = localStorage.getItem('selected-theme') || 'grayscale';
    const savedTheme = 'grayscale';
    window.setTheme(savedTheme);

    const dayNav = document.getElementById('day-nav');

    // 2. 渲染主導航欄文字 (從 metadata 動態載入)
    if (window.tripData && window.tripData.metadata) {
        const titleEl = document.getElementById('header-title');
        const subtitleEl = document.getElementById('header-subtitle');
        if(titleEl) titleEl.textContent = window.tripData.metadata.title;
        if(subtitleEl) subtitleEl.textContent = window.tripData.metadata.subtitle;
        document.title = window.tripData.metadata.title + "・行程規劃助手";
    }

    // 4. 生成左側日程導航按鈕 (過濾掉 metadata 並依照 YYYY-MM-DD 時間先後排序)
    let dayKeys = [];
    if (window.tripData && window.tripData.detail) {
        dayKeys = Object.keys(window.tripData.detail)
            .filter(k => k !== 'metadata')
            .sort((a, b) => new Date(a) - new Date(b));
    }
    if (dayNav) {
        dayNav.innerHTML = '';
        dayKeys.forEach((key, index) => {
            const day = window.tripData.detail[key];
            const dynamicDayNum = index + 1; // 💡 動態算出這是 D 幾
            const dateInfo = getDateDisplayInfo(key); // 💡 計算顯示的日期

            const btn = document.createElement('button');
            btn.id = `nav-day-${key}`;
            btn.className = "snap-start flex-shrink-0 flex items-center lg:w-full space-x-3 px-4 py-3 rounded-xl border text-left transition-all duration-300 font-medium text-xs lg:text-sm";
            btn.innerHTML = `
                <span class="day-badge w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs transition-colors duration-300">D${dynamicDayNum}</span>
                <div class="hidden sm:block text-left min-w-0 flex-grow">
                    <div class="day-date-txt font-bold text-xs truncate">${dateInfo.full}</div>
                    <div class="day-title-txt text-[10px] opacity-75 truncate mt-0.5 font-medium flex items-center gap-1">
                        <i data-lucide="hotel" class="w-3 h-3 shrink-0"></i>
                        <span class="truncate">${day.hotel || "溫暖的家"}</span>
                    </div>
                </div>
            `;
            btn.addEventListener('click', () => window.switchDay(key));
            dayNav.appendChild(btn);
        });
    }

    if (dayNav && dayNav.children.length > 0) {
        const lastDay = localStorage.getItem('active-day') || dayKeys[0];
        switchDay(lastDay);
    }

    // 7. 初始自動渲染天數，徹底消除一進頁面的載入狀態
    if (dayKeys.length > 0) {
        // 嘗試從 localStorage 恢復上次選取的日期
        let lastDay = localStorage.getItem('active-day');
        
        // 🛡️ 防呆：如果 localStorage 紀錄的天數不存在於「當前行程」中，或者沒有紀錄
        // 則強制將它重置為當前行程的第一天
        if (!lastDay || !dayKeys.includes(lastDay)) {
            lastDay = dayKeys[0];
        }
        console.log(`lastDay:${lastDay}`);
        
        switchDay(lastDay);
    }

    calculateTotalBudget();
    // 確保預算資料存在才重新渲染，避免初始加載時報錯
    if (window.budgetData) {
        renderBudget();
    }
    // 這樣不管使用者什麼時候按 Command+P，DOM 都已經準備好了！
    generatePrintContent();
    
    initIcons();
}

// ==========================================
// 🚀 程式啟動點：抓取參數與載入外部行程數據
// ==========================================
async function loadTripData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('無法載入 JSON');
        const data = await response.json();
        window.tripData = data; // 直接賦值
        return true;
    } catch (e) {
        console.error(e); 
        return false;
    }
}

async function fetchCloudTripData(tokenId) {
    const accessToken = sessionStorage.getItem('gapi_token');
    if (!accessToken) {
        alert("找不到登入憑證，請回到首頁重新登入！");
        window.location.href = 'index.html';
        return null;
    }

    try {
        // ✨ 直接呼叫 shared.js 的共用函式
        return await validateAndFetch(tokenId, accessToken);
    } catch (error) {
        if (error.message === "TOKEN_EXPIRED") {
            alert("您的工作階段已過期，請重新登入！");
            window.location.href = 'index.html';
        }
        return null;
    }
}

// 取得網址列參數
const urlParams = new URLSearchParams(window.location.search);
const tripToken = urlParams.get('trip_token');
const tripLocal = urlParams.get('trip_local');
const rawTripFile = urlParams.get('trip'); // 保留給 Server 測試

// 主程式啟動函式
async function startApp() {
    if (tripToken) { 
        // 雲端模式
        window.tripData = await fetchCloudTripData(tripToken);
        if (window.tripData) {
            localStorage.setItem(tripToken, JSON.stringify(window.tripData)); 
            render();
        } else {
            loadFail(tripToken);
        }        
    } else if (tripLocal) {
        // 本地模式
        console.log("從本地快取載入模式");
        // 使用 URL 傳來的 key (fileId/檔名) 讀取
        const localCacheString = localStorage.getItem(tripLocal);
        
        if (localCacheString) {
            window.tripData = JSON.parse(localCacheString);
            render();
        } else {
            // 如果抓不到，觸發失敗邏輯與錯誤提示
            alert("無法解析或找不到行程資料！");
            loadFail(tripLocal);
        }

    } else if (rawTripFile) {
        // 開發/伺服器測試模式
        console.log(`rawTripFile=${rawTripFile}`);
        const tripFile = (rawTripFile && rawTripFile.endsWith('.json') && !rawTripFile.startsWith('http')) 
                        ? rawTripFile 
                        : null;

        if (tripFile) {
            const tripLoadPromise = loadTripData(tripFile);
            const domReadyPromise = new Promise(resolve => {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', resolve);
                } else {
                    resolve();
                }
            });
            Promise.all([tripLoadPromise, domReadyPromise])
                .then(([tripSuccess]) => {
                    if (tripSuccess && window.tripData) {
                        localStorage.setItem(`trip_${rawTripFile}`, JSON.stringify(window.tripData));
                        render();
                    } else {
                        loadFail(tripFile);
                    }
                });
        }
    } else {
        alert("無效的行程參數！");
        window.location.href = 'index.html';
    }
}

// 執行主程式
startApp();

// ==========================================
// 🌟 綁定共用/全域事件 (如：匯出 JSON)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 檢查 setupExportFeature 是否存在 (確保 export.js 有被正確引入)
    if (typeof setupExportFeature === 'function') {
        setupExportFeature({
            buttonId: 'btn-export-json',
            // 點擊當下才回傳最新的 tripData
            getDataCallback: () => window.tripData, 
            defaultFileName: tripLocal
        });
    }
});

// ==========================================
// 💾 手動儲存按鈕邏輯
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const btnSave = document.getElementById('btn-save');
    if (btnSave) {
        btnSave.addEventListener('click', () => {
            // 1. 強制讓目前正在輸入的欄位失焦，確保最後一個字有寫入 window.tripData
            if (document.activeElement && document.activeElement.classList.contains('editable-element')) {
                document.activeElement.blur();
            }

            // 2. 決定存檔的 Key
            let activeFileId = rawTripFile;
            if (tripToken) { 
                activeFileId = tripToken;
            } else if (tripLocal) {
                activeFileId = tripLocal;
            } else if (rawTripFile) {
                activeFileId = `trip_${activeFileId}`
            }
            localStorage.setItem(activeFileId, JSON.stringify(window.tripData));
            // 5. 呼叫上方函式關閉編輯模式
            if (isPlannerEditMode) {
                exitEditMode();
            }
        });
    }
});

// ==========================================
// ✏️ 編輯模式控制引擎與草稿狀態
// ==========================================
let isPlannerEditMode = false;

function exitEditMode() {
    // 2. 正式關閉編輯狀態
    isPlannerEditMode = false;
    const btn = document.getElementById('btn-toggle-edit');
    
    const editables = document.querySelectorAll('.editable-element');
    const btnAddTimeline = document.getElementById('btn-add-timeline');
    const btnAddDay = document.getElementById('btn-add-day');
    const btnAddTip = document.getElementById('btn-add-tip');
    const guideContainer = document.getElementById('guide-container');
    const btnSave = document.getElementById('btn-save');
    const btnExport = document.getElementById('btn-export-json');    
    document.body.classList.remove('edit-mode');

    // 3. 徹底重寫按鈕內部 HTML，換回正常的編輯 Icon
    btn.classList.remove('bg-rose-500', 'hover:bg-rose-600');
    btn.classList.add('bg-white/10', 'hover:bg-white/20');
    btn.innerHTML = `<i data-lucide="edit-3" class="w-4 h-4"></i><span class="text-sm font-medium">編輯模式</span>`;
    // 4. 隱藏編輯用 UI
    btnSave.classList.add('hidden');
    btnExport.classList.remove('hidden');
    if (btnAddTimeline) { btnAddTimeline.classList.add('hidden'); btnAddTimeline.classList.remove('flex'); }
    if (btnAddDay) { btnAddDay.classList.add('hidden'); btnAddDay.classList.remove('flex'); }
    if (btnAddTip) { btnAddTip.classList.add('hidden'); btnAddTip.classList.remove('flex'); }
    if (guideContainer) { guideContainer.classList.add('hidden'); guideContainer.classList.remove('flex'); }
    editables.forEach(el => {
        el.setAttribute('contenteditable', 'false');
        el.classList.remove('hover:bg-slate-100', 'transition-colors', 'rounded', 'cursor-text', 'focus:outline-none', 'focus:ring-2', 'focus:ring-emerald-500/50');
    });
    document.querySelectorAll('.edit-only-ui').forEach(el => el.classList.add('hidden'));
}

function toggleEditMode() {
    const btn = document.getElementById('btn-toggle-edit');
    
    const editables = document.querySelectorAll('.editable-element');
    const btnAddTimeline = document.getElementById('btn-add-timeline');
    const btnAddDay = document.getElementById('btn-add-day');
    const btnAddTip = document.getElementById('btn-add-tip');
    const guideContainer = document.getElementById('guide-container');
    const btnSave = document.getElementById('btn-save');
    const btnExport = document.getElementById('btn-export-json');    

    if (!isPlannerEditMode) {
        // 🟢【進入編輯模式】
        isPlannerEditMode = true;
        document.body.classList.add('edit-mode');

        // 2. 徹底重寫按鈕內部 HTML (確保 Icon 被正確替換)
        btn.classList.remove('bg-white/10', 'hover:bg-white/20');
        btn.classList.add('bg-rose-500', 'hover:bg-rose-600');
        btn.innerHTML = `<i data-lucide="x-circle" class="w-4 h-4"></i><span class="text-sm font-medium">放棄變更</span>`;

        // 3. 顯示編輯用 UI
        btnSave.classList.remove('hidden');
        btnExport.classList.add('hidden');
        if (btnAddTimeline) { btnAddTimeline.classList.remove('hidden'); btnAddTimeline.classList.add('flex'); }
        if (btnAddDay) { btnAddDay.classList.remove('hidden'); btnAddDay.classList.add('flex'); }
        if (btnAddTip) { btnAddTip.classList.remove('hidden'); btnAddTip.classList.add('flex'); }
        if (guideContainer) { 
            guideContainer.classList.remove('hidden');
            guideContainer.classList.add('flex');
            renderSharedCards('metadata-guides-container', window.tripData.metadata.guides, (index) => `data-edit-meta="guide" data-guide-index="${index}"`)
        }
        
        editables.forEach(el => {
            el.setAttribute('contenteditable', 'true');
            el.classList.add('hover:bg-slate-100', 'transition-colors', 'rounded', 'cursor-text', 'focus:outline-none', 'focus:ring-2', 'focus:ring-emerald-500/50');
        });
        document.querySelectorAll('.edit-only-ui').forEach(el => el.classList.remove('hidden'));
        
    } else {
        // 🔴【離開編輯模式】
        if (confirm("確定要放棄剛才的所有修改嗎？")) {
            exitEditMode();
            startApp();
        }
    }
    
    // 重新呼叫 Lucide 去抓取我們剛剛用 innerHTML 塞進去的 <i> 標籤
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ==========================================
// ➕ 新增封面 Guide
// ==========================================
function addGuideItem() {
    if (!window.tripData) return;
    if (!window.tripData.metadata) window.tripData.metadata = {};
    if (!window.tripData.metadata.guides) window.tripData.metadata.guides = [];
    
    window.tripData.metadata.guides.push({
        type: "none",
        title: "",
        desc: ""
    });
    
    renderSharedCards('metadata-guides-container', window.tripData.metadata.guides, (index) => `data-edit-meta="guide" data-guide-index="${index}"`)
}

// ==========================================
// ➕ 新增時間軸項目
// ==========================================
function addTimelineItem() {
    // 取得目前正在瀏覽的天數 (例如: "day1")
    const dayId = localStorage.getItem('active-day');
    
    if (!dayId || !window.tripData || !window.tripData.detail[dayId]) return;

    // 建立一筆預設的行程資料
    const newItem = {
        time: "",
        event: "",
        desc: "",
        type: "",  // 預設樣式
        amount: 0
    };

    // 將資料推進當天的 timeline 陣列中
    window.tripData.detail[dayId].timeline.push(newItem);

    // 重新渲染該天畫面
    switchDay(dayId);

    // ⚠️ 重要：因為 switchDay() 會重新產生 HTML 元素，
    // 導致新產生的元素失去「編輯模式」的樣式與屬性，所以必須重新上一次屬性。
    if (isPlannerEditMode) {
        const editables = document.querySelectorAll('.editable-element');
        editables.forEach(el => {
            el.setAttribute('contenteditable', 'true');
            // 我們把原本的虛線移除，改成你後來的 hover 綠色底線/發光特效
            el.classList.add('hover:bg-slate-100', 'transition-colors', 'rounded', 'cursor-text', 'focus:outline-none', 'focus:ring-2', 'focus:ring-emerald-500/50');
        });
        
        // 確保 Lucide Icon 重新載入
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // 畫面捲動到底部，讓使用者看到剛新增的項目
        const timelineContainer = document.getElementById('detail-timeline');
        timelineContainer.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ==========================================
// 🔄 處理 Type 下拉選單變更與 Icon 即時連動
// ==========================================
window.handleTypeChange = function(selectEl) {
    // 1. 先呼叫原有的存檔邏輯，將新 Type 寫入記憶體
    if (typeof saveEditData === 'function') {
        saveEditData(selectEl);
    }

    // 2. 判斷是誰觸發的變更，決定要重新渲染哪一個區塊
    const meta = selectEl.dataset.editMeta;

    if (meta === 'guide') {
        // 👉 如果是封面指南 (Guide)，只重新渲染 Guide 區塊
        if (window.tripData && window.tripData.metadata && window.tripData.metadata.guides) {
            renderSharedCards('metadata-guides-container', window.tripData.metadata.guides, (index) => `data-edit-meta="guide" data-guide-index="${index}"`);
        }
    } else {
        // 👉 如果是行程 (Timeline) 或是提示 (Tips)，重新渲染目前的天數畫面
        const currentDay = localStorage.getItem('active-day');
        if (currentDay && typeof switchDay === 'function') {
            switchDay(currentDay);
        }
    }
    
    // 3. 畫面重新渲染後會「還原成檢視模式」，這裡強制將編輯狀態與特效加回來
    if (typeof isPlannerEditMode !== 'undefined' && isPlannerEditMode) {
        // 恢復文字可編輯狀態
        const editables = document.querySelectorAll('.editable-element');
        editables.forEach(node => {
            node.setAttribute('contenteditable', 'true');
            node.classList.add('hover:bg-slate-100', 'transition-colors', 'rounded', 'cursor-text', 'focus:outline-none', 'focus:ring-2', 'focus:ring-emerald-500/50');
        });
        
        // 💡 確保所有的下拉選單和按鈕等「編輯專屬 UI」保持顯示
        document.querySelectorAll('.edit-only-ui').forEach(el => {
            el.classList.remove('hidden');
            // 如果是被設定為 flex 的容器，確保它的 display 正確
            if(el.tagName !== 'BUTTON' && el.classList.contains('flex')) {
                el.style.display = 'flex';
            }
        });
        
        // 重新喚醒圖示
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
};

// 解析並寫回 window.tripData
function saveEditData(el) {
    const dayId = el.dataset.editDay;
    const index = el.dataset.editIndex;
    const tipIndex = el.dataset.editTipIndex;
    // 👇 新增抓取 Guide 專用的屬性
    const guideIndex = el.dataset.guideIndex; 
    const meta = el.dataset.editMeta; 
    const field = el.dataset.editField;

    // 將防呆機制改為只檢查 field
    if (!field) return;

    let newValue;
    if (el.tagName === 'SELECT') {
        newValue = el.value;
    } else {
        newValue = el.innerText.trim();
    }

    // 🌟 新增：獨立處理 Guide 的存檔邏輯
    if (meta === 'guide' && guideIndex !== undefined) {
        if (window.tripData.metadata && window.tripData.metadata.guides && window.tripData.metadata.guides[guideIndex]) {
            window.tripData.metadata.guides[guideIndex][field] = newValue;
        }
        return; // Guide 處理完就提早結束，不往下走
    }

    // 原本針對天數 (dayId) 的防呆機制移到這裡
    if (!dayId || !window.tripData.detail[dayId]) return;

    // ... (下方原本處理 title, region, timeline, tips 的程式碼完全不用動)
    if (field === 'title' || field === 'region') {
        window.tripData.detail[dayId][field] = newValue;
    } else if (index !== undefined) {
        if (window.tripData.detail[dayId].timeline[index]) {
            if (field === 'amount') {
                window.tripData.detail[dayId].timeline[index][field] = parseFloat(newValue) || 0;
            } else {
                window.tripData.detail[dayId].timeline[index][field] = newValue;
                // 如果是切換行程類型，一併刪除自訂 icon
                if (field === 'type') {
                    delete window.tripData.detail[dayId].timeline[index].icon;
                }
            }
        }
    } else if (tipIndex !== undefined) { 
        if (window.tripData.detail[dayId].tips && window.tripData.detail[dayId].tips[tipIndex]) {
            window.tripData.detail[dayId].tips[tipIndex][field] = newValue;
        }
    }
}

// ==========================================
// 🔄 即時更新時間軸圖示 (Type 變更時觸發)
// ==========================================
function updateTimelineIcon(selectElement, dayId, index) {
    const newType = selectElement.value;
    const iconContainer = document.getElementById(`timeline-icon-${dayId}-${index}`);
    
    if (iconContainer) {
        // 1. 更新外層的背景與邊框顏色 (透過 className 整個抽換)
        iconContainer.className = `absolute -left-3 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-sm z-10 transition-transform duration-300 hover:scale-110 ${getEventBg(newType)}`;
        
        // 2. 更新內部的 HTML 圖示標籤
        iconContainer.innerHTML = getEventIcon(newType);
        
        // 3. 要求 Lucide 重新渲染這顆剛被替換的新圖示
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ root: iconContainer });
        }
    }
    
    // 💡 同步將變更寫入記憶體中，確保存檔時邏輯一致
    if (window.tripData && window.tripData.detail[dayId] && window.tripData.detail[dayId].timeline[index]) {
        window.tripData.detail[dayId].timeline[index].type = newType;
        // 如果原本有設定客製化 icon (例如使用者自己在 JSON 寫死)，換 Type 時就順便清除掉，套用新 Type 的預設 icon
        delete window.tripData.detail[dayId].timeline[index].icon; 
    }
}

// ==========================================
// ➕ 新增天數
// ==========================================
function addDayItem() {
    if (!window.tripData || !window.tripData.detail) return;
    
    // 取得現有所有的日期，並排序
    const dayKeys = Object.keys(window.tripData.detail)
        .filter(k => k !== 'metadata')
        .sort((a, b) => new Date(a) - new Date(b));
    
    let newDateKey;
    
    if (dayKeys.length > 0) {
        // 抓出最後一天，加上 24 小時的毫秒數推算下一天
        const lastDateKey = dayKeys[dayKeys.length - 1];
        const lastDate = new Date(lastDateKey);
        lastDate.setDate(lastDate.getDate() + 1); // 加一天
        
        // 轉換回 YYYY-MM-DD 格式 (確保使用本地時間，避免時區誤差)
        const year = lastDate.getFullYear();
        const month = String(lastDate.getMonth() + 1).padStart(2, '0');
        const day = String(lastDate.getDate()).padStart(2, '0');
        newDateKey = `${year}-${month}-${day}`;
    } else {
        // 🌟 萬一原本一筆資料都沒有，預設取「今天」作為第一天
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        newDateKey = `${year}-${month}-${day}`;
    }

    // 寫入預設資料結構
    window.tripData.detail[newDateKey] = {
        title: "新的一天",
        region: "新地區",
        hotel: "未定",
        tips: [],
        timeline: []
    };

    // 重新渲染並切換過去
    render();
    switchDay(newDateKey);
    
    // 重新為新產生的元素加上編輯狀態
    if (isPlannerEditMode) {
        const editables = document.querySelectorAll('.editable-element');
        editables.forEach(el => {
            el.setAttribute('contenteditable', 'true');
            el.classList.add('hover:bg-slate-100', 'transition-colors', 'rounded', 'cursor-text', 'focus:outline-none', 'focus:ring-2', 'focus:ring-emerald-500/50');
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

// ==========================================
// 📅 更改天數日期 (Edit Date)
// ==========================================
function changeDayDate (oldDateKey, newDateKey) {
    // 防呆：如果沒有選擇新日期，或日期沒變，則不執行
    if (!newDateKey || oldDateKey === newDateKey) return;
    
    // 防呆：檢查新日期是否已經存在行程中，避免覆蓋掉原本的其他天
    if (window.tripData.detail[newDateKey]) {
        alert("該日期已經有行程了，請選擇其他日期！");
        // 把 input 值重置回原來的日期
        switchDay(oldDateKey); 
        return;
    }
    
    // 1. 將舊日期的所有資料「搬移」到新日期的 Key 之下
    window.tripData.detail[newDateKey] = window.tripData.detail[oldDateKey];
    
    // 2. 刪除舊日期的資料
    delete window.tripData.detail[oldDateKey];
    
    // 3. 更新 LocalStorage 中正在瀏覽的天數，避免重新渲染後跳回第一天
    localStorage.setItem('active-day', newDateKey);
    
    // 4. 重新渲染畫面 (這會重新排序左側導航與天數)
    render();
    switchDay(newDateKey);
    
    // 5. 因為目前處於編輯模式，畫面重繪後需要手動將編輯狀態與 UI 再次喚醒
    if (isPlannerEditMode) {
        const editables = document.querySelectorAll('.editable-element');
        editables.forEach(el => {
            el.setAttribute('contenteditable', 'true');
            el.classList.add('hover:bg-slate-100', 'transition-colors', 'rounded', 'cursor-text', 'focus:outline-none', 'focus:ring-2', 'focus:ring-emerald-500/50');
        });
        document.querySelectorAll('.edit-only-ui').forEach(el => {
            el.classList.remove('hidden');
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
};
// ==========================================
// ➕ 新增 Tip
// ==========================================
function addTipItem() {
    const dayId = localStorage.getItem('active-day');
    if (!dayId || !window.tripData || !window.tripData.detail[dayId]) return;

    if (!window.tripData.detail[dayId].tips) {
        window.tripData.detail[dayId].tips = [];
    }

    // 塞入預設的 Tip
    window.tripData.detail[dayId].tips.push({
        type: "info",
        title: "新增提示標題",
        desc: "點擊編輯提示內容..."
    });

    switchDay(dayId);

    if (isPlannerEditMode) {
        const editables = document.querySelectorAll('.editable-element');
        editables.forEach(el => {
            el.setAttribute('contenteditable', 'true');
            el.classList.add('hover:bg-slate-100', 'transition-colors', 'rounded', 'cursor-text', 'focus:outline-none', 'focus:ring-2', 'focus:ring-emerald-500/50');
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        // 畫面捲動到右下角
        const tipsContainer = document.getElementById('tips-container');
        tipsContainer.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}
