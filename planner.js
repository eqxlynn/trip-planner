// ==========================================
// 🎨 主題樣式設定 (THEMES)
// ==========================================
const THEMES = {
    summer: {
        header: 'bg-gradient-to-r from-teal-700 via-emerald-600 to-cyan-600',
        headerText: 'text-teal-200',
        selectedDay: 'bg-gradient-to-r from-teal-700 to-emerald-600 border-transparent text-white shadow-teal-900/20',
        selectedBadge: 'bg-white text-teal-900',
        detailBadge: 'text-teal-700 bg-teal-50',
        timelineTime: 'text-teal-600 bg-teal-50',
        totalCard: 'bg-teal-500/10 border border-teal-500/20 text-teal-900',
        totalCardTitle: 'text-teal-700',
        walletIcon: 'text-teal-600'
    },
    midnight: {
        header: 'bg-gradient-to-r from-indigo-950 via-purple-900 to-rose-900',
        headerText: 'text-indigo-200',
        selectedDay: 'bg-gradient-to-r from-indigo-900 to-purple-800 border-transparent text-white shadow-indigo-900/20',
        selectedBadge: 'bg-white text-indigo-950',
        detailBadge: 'text-indigo-700 bg-indigo-50',
        timelineTime: 'text-indigo-600 bg-indigo-50',
        totalCard: 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-900',
        totalCardTitle: 'text-indigo-700',
        walletIcon: 'text-indigo-600'
    },
    autumn: {
        header: 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-500',
        headerText: 'text-amber-200',
        selectedDay: 'bg-gradient-to-r from-red-600 to-orange-500 border-transparent text-white shadow-orange-900/20',
        selectedBadge: 'bg-white text-red-600',
        detailBadge: 'text-orange-700 bg-orange-50',
        timelineTime: 'text-orange-600 bg-orange-50',
        totalCard: 'bg-amber-500/10 border border-amber-500/20 text-amber-900',
        totalCardTitle: 'text-amber-700',
        walletIcon: 'text-orange-600'
    },
    grayscale: {
        header: 'bg-slate-800 text-white',
        headerText: 'text-slate-300',
        selectedDay: 'bg-slate-900 text-white border border-slate-700',
        selectedBadge: 'bg-white text-slate-900',
        detailBadge: 'text-slate-700 bg-slate-200',
        timelineTime: 'text-slate-600 bg-slate-100',
        totalCard: 'bg-slate-100 border border-slate-200 text-slate-800',
        totalCardTitle: 'text-slate-700',
        walletIcon: 'text-slate-700'
    }
};

// ==========================================
// 🛠️ 核心函式
// ==========================================

// 主題設置函式
function setTheme(themeName) {
    window.currentTheme = themeName;
    localStorage.setItem('selected-theme', themeName); // 將選擇存入 localStorage
    
    const theme = THEMES[themeName];
    
    // 1. 更新 Header 漸層色
    const header = document.getElementById('main-header');
    header.className = `${theme.header} text-white shadow-md transition-all duration-500`;
    
    // 2. 更新 Header Icon 顏色
    const icon = document.getElementById('header-icon');
    icon.className = `w-7 h-7 ${theme.headerText}`;

    // 3. 更新隨身指南小卡 Alert 圖示 (若存在)
    const cardIcon = document.getElementById('card-alert-icon');
    if(cardIcon) {
        cardIcon.className = `w-4 h-4 ${themeName === 'summer' ? 'text-teal-700' : themeName === 'midnight' ? 'text-indigo-700' : 'text-orange-700'}`;
    }

    // 4. 更新錢包 Icon
    const walletIcon = document.getElementById('wallet-icon');
    walletIcon.className = `w-5 h-5 ${theme.walletIcon}`;

    // 5. 更新主題按鈕選取狀態
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.className = "theme-btn px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all duration-200 text-white/80 hover:text-white";
    });
    const activeBtn = document.getElementById(`btn-theme-${themeName}`);
    if (activeBtn) activeBtn.className = "theme-btn px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all duration-200 bg-white/20 text-white shadow-inner";

    // 6. 重新渲染畫面（帶入最新樣式）
    const dayNav = document.getElementById('day-nav');
    if (dayNav && dayNav.children.length > 0) {
        const lastDay = localStorage.getItem('active-day') || dayKeys[0];
        switchDay(lastDay);
    }
    renderBudget();
}

// 限制 Lucide Icon 掃描的 DOM 範圍，避免全域掃描拖慢速度
function initIcons(rootElement = document.body) {
    if (window.lucide) {
        window.lucide.createIcons({ root: rootElement });
    }
}

function getEventIcon(type) {
    const icons = {
        flight: '<i data-lucide="plane" class="w-4 h-4 text-sky-600"></i>',
        transit: '<i data-lucide="train" class="w-4 h-4 text-amber-600"></i>',
        hiking: '<i data-lucide="footprints" class="w-4 h-4 text-emerald-600"></i>',
        hotel: '<i data-lucide="hotel" class="w-4 h-4 text-indigo-600"></i>',
        food: '<i data-lucide="utensils" class="w-4 h-4 text-rose-600"></i>',
        shopping: '<i data-lucide="shopping-bag" class="w-4 h-4 text-purple-600"></i>'
    };
    return icons[type] || '<i data-lucide="map-pin" class="w-4 h-4 text-slate-600"></i>';
}

function getEventBg(type) {
    const bgs = {
        flight: 'bg-sky-50 border-sky-100',
        transit: 'bg-amber-50 border-amber-100',
        hiking: 'bg-emerald-50 border-emerald-100',
        hotel: 'bg-indigo-50 border-indigo-100',
        food: 'bg-rose-50 border-rose-100',
        shopping: 'bg-purple-50 border-purple-100'
    };
    return bgs[type] || 'bg-slate-50 border-slate-100';
}

function getAlertStyles(type) {
    const styles = {
        success: {
            box: 'bg-emerald-50 border-emerald-100 text-emerald-900',
            icon: '<i data-lucide="check-circle" class="w-5 h-5 text-emerald-600"></i>'
        },
        info: {
            box: 'bg-sky-50 border-sky-100 text-sky-900',
            icon: '<i data-lucide="info" class="w-5 h-5 text-sky-600"></i>'
        },
        warning: {
            box: 'bg-amber-50 border-amber-100 text-amber-900',
            icon: '<i data-lucide="alert-triangle" class="w-5 h-5 text-amber-600"></i>'
        },
        danger: {
            box: 'bg-red-50 border-red-100 text-red-900',
            icon: '<i data-lucide="alert-octagon" class="w-5 h-5 text-red-600"></i>'
        }
    };
    return styles[type] || styles.info;
}

// ==========================================
// 📊 介面渲染邏輯
// ==========================================
/**
 * 將 Markdown 語法轉換為 HTML
 * 支援: 粗體 (**text**), 連結 ([text](url)), 條列 (- item)
 */
function parseMarkdownList(text) {
    // 1. 防呆機制：若無內容直接返回空字串，防止顯示 undefined
    if (!text || typeof text !== 'string') return '';
    
    let html = text;

    // 2. 處理粗體: **text** -> <strong>text</strong>
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 3. 處理 Markdown 連結: [text](url) -> <a href="...">...</a>
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
        return `<a href="${url}" target="_blank" class="inline-flex items-center gap-1 mt-1 bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide transition-colors duration-200 shadow-sm">
            <span>${text}</span>
            <i data-lucide="external-link" class="w-3 h-3"></i>
        </a>`;
    });

    // 4. 處理 Markdown 條列: - item 或 * item
    // 檢查是否有包含換行後的條列符號
    if (html.includes('- ') || html.includes('* ')) {
        // 將文字依換行符號分割，並過濾掉空行
        const items = html.split(/\n[-*] /).filter(item => item.trim() !== "");
        
        // 如果切分後只有一個項目，代表它可能不是列表，直接轉為段落
        if (items.length > 1) {
            return `<ul class="list-disc pl-4 space-y-1 text-xs text-slate-600 mt-2">${items.map(i => `<li>${i.trim()}</li>`).join('')}</ul>`;
        }
    }
    
    // 5. 預設處理：若無條列符號，將換行轉為 <br> 並包覆在 <p> 標籤中
    return `<p class="text-xs text-slate-500 leading-relaxed mt-1.5">${html.replace(/\n/g, '<br>')}</p>`;
}

// 交通預算速覽渲染邏輯
function renderBudget() {
    if (window.budgetData) {
        document.getElementById('budget-section').classList.remove('hidden');
        
        // 從目前主題狀態中抓取最新樣式
        const themeName = window.currentTheme || localStorage.getItem('selected-theme') || 'grayscale';
        const theme = THEMES[themeName];
        
        const container = document.getElementById('budget-cards-container');
        if (!container) return;
        container.innerHTML = '';
        
        // 渲染前三個細分預算項目
        window.budgetData.items.forEach(item => {
            const card = document.createElement('div');
            card.className = "bg-slate-50 rounded-xl p-4 border border-slate-100";
            card.innerHTML = `
                <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">${item.title}</span>
                <div class="text-lg font-black text-slate-800 mt-1">${item.amount}</div>
            `;
            container.appendChild(card);
        });

        // 渲染總計卡片 (同步套用主題樣式)
        const totalCard = document.createElement('div');
        totalCard.className = `${theme.totalCard} rounded-xl p-4 transition-all duration-300`;
        totalCard.innerHTML = `
            <span class="text-[10px] ${theme.totalCardTitle} font-black uppercase tracking-wider">${window.budgetData.total.title}</span>
            <div class="text-xl font-black mt-1">${window.budgetData.total.amount}</div>
        `;
        container.appendChild(totalCard);

        // 購票指南
        document.getElementById('budget-guide-text').innerHTML = `
            <strong class="font-bold">買票與集章提示：</strong> ${window.budgetData.tips}
        `;

        const expenses = window.budgetData.jrExpensesByDay;
        if (!expenses) return;

        document.getElementById('jr-expense-list').innerHTML = Object.keys(expenses).map(day => `
            <div class="mb-4 last:mb-0">
                <div class="font-black text-teal-800 text-xs border-b border-teal-200 mb-2 pb-1 bg-teal-50 px-2 py-1 rounded">
                    Day ${day}
                </div>
                <div class="space-y-1">
                    ${expenses[day].map(item => `
                        <div class="flex justify-between text-xs py-1 px-2 hover:bg-white rounded transition">
                            <span class="text-slate-600">${item.desc}</span>
                            <span class="font-mono font-bold text-slate-800">¥${item.amount.toLocaleString()}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }
}

// 取得提示卡主題色
function getTipTheme(type) {
    const themes = {
        transit: { bg: 'bg-amber-50/50', border: 'border-amber-100/50', icon: 'text-amber-600', title: 'text-amber-800' },
        scenery: { bg: 'bg-emerald-50/50', border: 'border-emerald-100/50', icon: 'text-emerald-600', title: 'text-emerald-800' },
        food: { bg: 'bg-rose-50/50', border: 'border-rose-100/50', icon: 'text-rose-600', title: 'text-rose-800' },
        shopping: { bg: 'bg-purple-50/50', border: 'border-purple-100/50', icon: 'text-purple-600', title: 'text-purple-800' },
        culture: { bg: 'bg-indigo-50/50', border: 'border-indigo-100/50', icon: 'text-indigo-600', title: 'text-indigo-800' },
        default: { bg: 'bg-sky-50/50', border: 'border-sky-100/50', icon: 'text-sky-600', title: 'text-sky-800' }
    };
    return themes[type] || themes.default;
};

// 切換天數控制引擎
function switchDay(dayId) {
    localStorage.setItem('active-day', dayId);
    const data = window.tripData[dayId];
    if (!data) return;
    
    const theme = THEMES[window.currentTheme];

    // 1. 更新左側日程選單按鈕的色調 (過濾跳過 metadata 節點)
    Object.keys(window.tripData).forEach(key => {
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
    const detailDate = document.getElementById('detail-date');
    if (detailDate) detailDate.textContent = `DAY ${data.dayNum} - ${data.date.split(' ')[0]}`;
    
    const detailTitle = document.getElementById('detail-title');
    if (detailTitle) detailTitle.textContent = data.title;
    
    // 渲染badge
    const badge = document.getElementById('detail-badge');
    if (badge) badge.className = `inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-md transition-colors duration-300 ${theme.detailBadge}`;
    
    const regionTxt = document.getElementById('detail-region-txt');
    if (regionTxt) regionTxt.textContent = data.region;

    // 3. 處理警示卡
    const alertBox = document.getElementById('detail-alert-box');
    const alertTitle = document.getElementById('detail-alert-title');
    const alertDesc = document.getElementById('detail-alert-desc');
    const alertIconContainer = document.getElementById('alert-icon-container');

    if (data.alert) {
        const styles = getAlertStyles(data.alert.type);
        alertBox.className = `rounded-2xl p-4 border transition-all duration-300 flex space-x-3 ${styles.box}`;
        alertIconContainer.innerHTML = styles.icon;
        alertTitle.textContent = data.alert.title;
        alertDesc.textContent = data.alert.desc;
        alertBox.classList.remove('hidden');
    } else {
        alertBox.classList.add('hidden');
    }

    // 4. 動態生成提示卡 (Tips)
    const tipsContainer = document.getElementById('tips-container');
    if (tipsContainer) {
        let tips = data.tips || [];

        tipsContainer.innerHTML = tips.map(tip => {
            const style = window. getTipTheme(tip.type);
            const iconName = tip.icon || 'info';
            return `
                <div class="${style.bg} border ${style.border} rounded-xl p-3.5 flex gap-3">
                    <i data-lucide="${iconName}" class="w-5 h-5 ${style.icon} shrink-0 mt-0.5"></i>
                    <div>
                        <h4 class="font-bold text-xs ${style.title} tracking-wider mb-1">${tip.title}</h4>
                        <p class="text-xs text-slate-600 leading-relaxed">${tip.desc}</p>
                    </div>
                </div>
            `;
        }).join('');
        window.initIcons();
    }

    // 5. 渲染精密齒輪時間軸
    const timelineContainer = document.getElementById('detail-timeline');
    timelineContainer.innerHTML = ''; // 清空舊內容

    data.timeline.forEach(item => {
        const el = document.createElement('div');
        el.className = 'relative pl-8 transition-all duration-300 hover:translate-x-0.5';

        // 這裡將原本的 item.desc 傳入 parseMarkdownList 進行轉換
        el.innerHTML = `
            <div class="absolute -left-3 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-sm z-10 transition-transform duration-300 hover:scale-110 ${getEventBg(item.type)}">
                ${getEventIcon(item.type)}
            </div>
            <div>
                <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <span class="text-xs font-black tracking-widest px-2 py-0.5 rounded-md w-max ${theme.timelineTime}">
                        ${item.time}
                    </span>
                    <h4 class="font-bold text-sm sm:text-base text-slate-800 leading-snug">${item.event}</h4>
                </div>
                ${parseMarkdownList(item.desc)}
            </div>
        `;
        timelineContainer.appendChild(el);
    });

    // 6. 載入備忘錄
    const notepad = document.getElementById('notepad');
    const storedMemo = localStorage.getItem(`memo-day-${dayId}`);
    if (notepad) {
        notepad.value = storedMemo || '';
    }

    // 只掃描中間主內容區，避免全域掃描
    initIcons(document.getElementById('main-content-section'));

    // UX 優化：手機版切換天數時，自動滾動回內容頂部
    if (window.innerWidth < 1024) {
        document.getElementById('detail-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ==========================================
// 🖨️ 旅遊手冊列印引擎 (Print Mode)
// ==========================================
window.printItinerary = function() {
    if (!window.tripData) return;
    
    const printContainer = document.getElementById('print-container');
    printContainer.innerHTML = ''; // 清空
    
    const dayKeys = Object.keys(window.tripData).filter(key => key !== 'metadata');
    const metadata = window.tripData.metadata;

    // 1. 生成封面
    let htmlContent = `
        <div class="p-10 text-center flex flex-col justify-center items-center" style="height: 100vh;">
            <h1 class="text-5xl font-black mb-6 text-slate-800">${metadata.title}</h1>
            <h2 class="text-2xl font-bold text-slate-500 mb-12">${metadata.subtitle}</h2>
            <div class="border-t-2 border-slate-200 pt-8 mt-8 w-1/2">
                <h3 class="text-lg font-bold mb-4">行前裝備與注意事項</h3>
                <ul class="text-left text-sm space-y-2 list-disc pl-6 text-slate-600">
                    ${metadata.gearGuide ? metadata.gearGuide.map(g => `<li>${g}</li>`).join('') : ''}
                </ul>
            </div>
        </div>
    `;

    // 2. 生成每一天的內頁
    dayKeys.forEach((key, index) => {
        const day = window.tripData[key];
        
        // 生成時間軸 HTML
        const timelineHtml = day.timeline.map(item => `
            <div class="flex items-start mb-6">
                <div class="w-24 shrink-0 text-sm font-bold text-slate-500 pt-0.5">${item.time}</div>
                <div class="flex-grow pl-4 border-l-2 border-slate-200 ml-2">
                    <h4 class="font-bold text-lg text-slate-800">${item.event}</h4>
                    <p class="text-sm text-slate-600 mt-1">${item.desc}</p>
                </div>
            </div>
        `).join('');

        // 處理備忘錄邏輯：如果有內容才顯示，否則 skip
        const savedMemo = localStorage.getItem(`memo-day-${key}`);
        let memoHtml = '';
        if (savedMemo && savedMemo.trim() !== '') {
            // 將換行符號轉為 HTML 的 <br> 標籤以正確顯示
            const displayMemo = savedMemo.replace(/\n/g, '<br>');
            memoHtml = `
                <div class="mt-12 pt-6 border-t border-dashed border-slate-300">
                    <h4 class="text-slate-400 text-sm font-bold mb-4">✏️ 備忘錄</h4>
                    <div class="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg">
                        ${displayMemo}
                    </div>
                </div>
            `;
        }
        
        // 插入分頁符號 (page-break-before)
        htmlContent += `
            <div class="print-page-break p-10">
                <div class="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-end">
                    <div>
                        <span class="text-sm font-black text-slate-400">DAY ${day.dayNum} - ${day.date}</span>
                        <h2 class="text-3xl font-black text-slate-900 mt-1">${day.title}</h2>
                    </div>
                    <span class="text-sm font-bold bg-slate-100 px-3 py-1 rounded">${day.region}</span>
                </div>
                
                <div class="flex gap-6 mb-8">
                    <div class="w-1/2 bg-slate-50 p-4 rounded-lg">
                        <h4 class="font-bold text-sm mb-2 text-slate-700">💡 交通與行李攻略</h4>
                        <p class="text-sm text-slate-600">${day.transitTip}</p>
                    </div>
                    <div class="w-1/2 bg-slate-50 p-4 rounded-lg">
                        <h4 class="font-bold text-sm mb-2 text-slate-700">🍁 拍照與健行亮點</h4>
                        <p class="text-sm text-slate-600">${day.sceneryTip}</p>
                    </div>
                </div>

                <div class="mt-8">
                    ${timelineHtml}
                </div>

                <!-- 備忘錄區塊 (若無內容則會自動隱藏) -->
                ${memoHtml}
            </div>
        `;
    });

    // 寫入容器並觸發列印
    printContainer.innerHTML = htmlContent;
    printContainer.classList.remove('hidden');
    
    // 稍微延遲讓 DOM 渲染完成後呼叫列印
    setTimeout(() => {
        window.print();
        // 列印視窗關閉後，重新隱藏容器
        printContainer.classList.add('hidden');
    }, 500);
};

// 核心啟動函式
function initApp(tripSuccess, fileLoadedName) {
    const dayNav = document.getElementById('day-nav');
    const notepad = document.getElementById('notepad');
    const dataStatusTxt = document.getElementById('data-status-txt');
    const fallbackWarning = document.getElementById('fallback-warning');
    const fallbackReasonText = document.getElementById('fallback-reason-text');

    // 1. 處理數據檔載入失敗的 Fallback 邏輯
    if (!tripSuccess || !window.tripData) {
        if(fallbackWarning) fallbackWarning.classList.remove('hidden');
        if(fallbackReasonText) fallbackReasonText.innerHTML = `無法讀取到行程數據 <strong>${fileLoadedName}</strong>。<br>請確認該 JS 檔案與網頁置於同個資料夾中，或者檢查網址 query 參數是否正確。`;
        const detailTitle = document.getElementById('detail-title');
        if(detailTitle) detailTitle.textContent = "數據檔載入失敗";
        if(dataStatusTxt) dataStatusTxt.textContent = "狀態：載入失敗";
        initIcons();
        return;
    }

    // 2. 渲染主導航欄文字 (從 metadata 動態載入)
    if (window.tripData && window.tripData.metadata) {
        const titleEl = document.getElementById('header-title');
        const subtitleEl = document.getElementById('header-subtitle');
        if(titleEl) titleEl.textContent = window.tripData.metadata.title;
        if(subtitleEl) subtitleEl.textContent = window.tripData.metadata.subtitle;
        document.title = window.tripData.metadata.title + "・行程規劃助手";
    }

    // 3. 渲染裝備指南
    if (window.tripData.metadata?.gearGuide) {
        const gearList = document.getElementById('gear-list');
        if(gearList) {
            gearList.innerHTML = '';
            window.tripData.metadata.gearGuide.forEach(g => {
                const li = document.createElement('li');
                li.textContent = g;
                gearList.appendChild(li);
            });
        }
    }
    
    // 4. 生成左側日程導航按鈕
    const dayKeys = Object.keys(window.tripData).filter(key => key !== 'metadata');
    if (dayNav) {
        dayNav.innerHTML = '';
        dayKeys.forEach(key => {
            const day = window.tripData[key];
            const btn = document.createElement('button');
            btn.id = `nav-day-${key}`;
            btn.className = "snap-start flex-shrink-0 flex items-center lg:w-full space-x-3 px-4 py-3 rounded-xl border text-left transition-all duration-300 font-medium text-xs lg:text-sm";
            btn.innerHTML = `
                <span class="day-badge w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs transition-colors duration-300">D${day.dayNum}</span>
                <div class="hidden sm:block text-left min-w-0 flex-grow">
                    <div class="day-date-txt font-bold text-xs truncate">${day.date}</div>
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
    
    // 5. 自動備忘錄存檔監聽
    if (notepad) {
        notepad.addEventListener('input', () => {
            const lastDay = localStorage.getItem('active-day');
            if (lastDay) {
                localStorage.setItem(`memo-day-${lastDay}`, notepad.value);
            }
        });
    }

    // 7. 啟動預算面板
    renderBudget();

    // 6. 優先讀取 localStorage 記憶的主題，若無則預設為 summer (涼夏)
    const savedTheme = localStorage.getItem('selected-theme') || 'summer';
    window.setTheme(savedTheme);

    // 7. 初始自動渲染第一個天數 D1，徹底消除一進頁面的空白載入狀態
    if (dayKeys.length > 0) {
        // localStorage 恢復上次選取的日期，若無則預設第一天
        const lastDay = localStorage.getItem('active-day') || dayKeys[0];
        if (dayKeys.includes(lastDay)) {
            switchDay(lastDay);
        }
    }
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
function loadDataScript(src) {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
    });
}
// 抓取網址列 query parameters 並防範 XSS 攻擊
const urlParams = new URLSearchParams(window.location.search);
const rawTripFile = urlParams.get('trip');

// 安全驗證：確保只能載入 .js 結尾且非外部 http 網址的本地檔案
const tripFile = (rawTripFile && rawTripFile.endsWith('.json') && !rawTripFile.startsWith('http')) 
                 ? rawTripFile 
                 : 'trip_data.json';

// 同步等待：確保行程數據載入與 HTML 結構 (DOM) 皆備妥才啟動
//const tripLoadPromise = loadDataScript(tripFile);
const tripLoadPromise = loadTripData(tripFile);
const domReadyPromise = new Promise(resolve => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve);
    } else {
        resolve(); // 若 DOM 已經載入完畢，直接 resolve
    }
});

Promise.all([tripLoadPromise, domReadyPromise])
    .then(([tripSuccess]) => {
        initApp(tripSuccess, tripFile);
    });
