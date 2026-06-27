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
        walletIcon: 'text-teal-600',
        listHeader: 'text-teal-800 border-teal-200 bg-teal-50',
        // JR Pass 區塊專屬
        passTitle: 'text-indigo-800',
        passIcon: 'text-indigo-600',
        passBox: 'bg-indigo-50/30 border-indigo-100',
        passTotalBox: 'border-indigo-200',
        passTotalLabel: 'text-indigo-700',
        passTotalValue: 'text-indigo-900',
        passDivider: 'text-indigo-800/70 border-indigo-100',
        passHover: 'hover:border-indigo-300',
        passSaveTag: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        tipsBox: 'bg-teal-50/50 border-teal-100',
        tipsIcon: 'text-teal-600',
        tipsText: 'text-teal-900'
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
        walletIcon: 'text-indigo-600',
        listHeader: 'text-indigo-800 border-indigo-200 bg-indigo-50',
        // JR Pass 區塊專屬
        passTitle: 'text-indigo-800',
        passIcon: 'text-indigo-600',
        passBox: 'bg-indigo-50/30 border-indigo-100',
        passTotalBox: 'border-indigo-200',
        passTotalLabel: 'text-indigo-700',
        passTotalValue: 'text-indigo-900',
        passDivider: 'text-indigo-800/70 border-indigo-100',
        passHover: 'hover:border-indigo-300',
        passSaveTag: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        tipsBox: 'bg-indigo-50/50 border-indigo-100',
        tipsIcon: 'text-indigo-600',
        tipsText: 'text-indigo-900'
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
        walletIcon: 'text-orange-600',
        listHeader: 'text-orange-800 border-orange-200 bg-orange-50',
        // JR Pass 區塊專屬
        passTitle: 'text-orange-800',
        passIcon: 'text-orange-600',
        passBox: 'bg-orange-50/30 border-orange-100',
        passTotalBox: 'border-orange-200',
        passTotalLabel: 'text-orange-700',
        passTotalValue: 'text-orange-900',
        passDivider: 'text-orange-800/70 border-orange-100',
        passHover: 'hover:border-orange-300',
        passSaveTag: 'text-orange-700 bg-orange-50 border-orange-200',
        tipsBox: 'bg-orange-50/50 border-orange-100',
        tipsIcon: 'text-orange-600',
        tipsText: 'text-orange-900'
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
        walletIcon: 'text-slate-700',
        listHeader: 'text-slate-800 border-slate-200 bg-slate-200/50',
        // JR Pass 區塊專屬
        passTitle: 'text-slate-800',
        passIcon: 'text-slate-500',
        passBox: 'bg-slate-50 border-slate-100',
        passTotalBox: 'border-slate-200',
        passTotalLabel: 'text-slate-600',
        passTotalValue: 'text-slate-800',
        passDivider: 'text-slate-400 border-slate-200',
        passHover: 'hover:border-slate-300',
        passSaveTag: 'text-slate-700 bg-slate-100 border-slate-300',
        tipsBox: 'bg-slate-50 border-slate-200',
        tipsIcon: 'text-slate-500',
        tipsText: 'text-slate-700'
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

function getEventIcon(type, customIcon) {
    const icons = {
        flight: '<i data-lucide="plane" class="w-4 h-4 text-sky-600"></i>',
        transit: '<i data-lucide="train" class="w-4 h-4 text-amber-600"></i>',
        bus: '<i data-lucide="bus" class="w-4 h-4 text-amber-600"></i>',
        jr: '<i data-lucide="train" class="w-4 h-4 text-amber-600"></i>',
        train: '<i data-lucide="train" class="w-4 h-4 text-amber-600"></i>',
        hiking: '<i data-lucide="footprints" class="w-4 h-4 text-emerald-600"></i>',
        hotel: '<i data-lucide="hotel" class="w-4 h-4 text-slate-600"></i>',
        food: '<i data-lucide="utensils" class="w-4 h-4 text-rose-600"></i>',
        shopping: '<i data-lucide="shopping-bag" class="w-4 h-4 text-purple-600"></i>',
        stamp: '<i data-lucide="stamp" class="w-4 h-4 text-indigo-600"></i>',
        culture: '<i data-lucide="landmark" class="w-4 h-4 text-indigo-600"></i>',
    };
    
    // 取得預設的 icon HTML 字串
    let htmlStr = icons[type] || '<i data-lucide="map-pin" class="w-4 h-4 text-slate-600"></i>';
    
    // 如果有設定 customIcon，則替換掉 data-lucide 的值，保留原有的顏色 class
    if (customIcon) {
        htmlStr = htmlStr.replace(/data-lucide="[^"]+"/, `data-lucide="${customIcon}"`);
    }
    
    return htmlStr;
}

function getEventBg(type) {
    const bgs = {
        flight: 'bg-sky-50 border-sky-100',
        transit: 'bg-amber-50 border-amber-100',
        bus: 'bg-amber-50 border-amber-100',
        jr: 'bg-amber-50 border-amber-100',
        train: 'bg-amber-50 border-amber-100',
        hiking: 'bg-emerald-50 border-emerald-100',
        hotel: 'bg-slate-50 border-slate-100',
        food: 'bg-rose-50 border-rose-100',
        shopping: 'bg-purple-50 border-purple-100',
        stamp: 'bg-indigo-50 border-indigo-100',
        culture: 'bg-indigo-50 border-indigo-100',
    };
    return bgs[type] || 'bg-slate-50 border-slate-100';
}

// ==========================================
// 📊 介面渲染邏輯
// ==========================================
/**
 * 將 Markdown 語法轉換為 HTML
 * @param {string} text - 原始 Markdown 文字
 * @param {boolean} isPrint - 是否為列印模式 (預設為 false)
 */
function parseMarkdownList(text, isPrint = false) {
    if (!text || typeof text !== 'string') return '';
    
    let html = text;

    // 1. 處理粗體
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 2. 處理連結 [文字](網址)
    if (isPrint) {
        // 🖨️ 列印模式：移除網址連結
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '');
    } else {
        // 💻 網頁模式修正：將 <a> 標籤內的所有內容寫在「同一行」，避免被後續的 split('\n') 切斷！
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
            return `<a href="${url}" target="_blank" class="inline-flex items-center gap-1 bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide transition-colors duration-200 shadow-sm align-middle mx-1 -translate-y-[1px]"><span>${text}</span><i data-lucide="external-link" class="w-3 h-3"></i></a>`;
        });
    }

    // 3. 處理數字列表 (Ordered List) - 支援 "1. " 或 "#. "
    if (/^(?:\d+|#)\.\s/m.test(html)) {
        const lines = html.split('\n');
        let listItems = '';
        
        lines.forEach(line => {
            // 匹配行首為 "數字. " 或 "#. " 的內容
            const match = line.trim().match(/^(?:\d+|#)\.\s+(.*)/);
            if (match) {
                const content = match[1].trim(); 
                if (content !== '') {
                    listItems += `<li>${content}</li>`;
                }
            } else if (line.trim() !== "") {
                // 無項目符號的文字換行處理
                listItems += `<li class="list-none pt-2">${line.trim()}</li>`;
            }
        });
        // 💡 數字列表使用 <ol> 與 list-decimal，並將左側縮排稍微加大至 pl-5 以容納數字寬度
        return `<ol class="list-decimal pl-5 space-y-1.5 text-xs text-slate-600 mt-2">${listItems}</ol>`;
    }

    // 4. 處理無序列表 (Unordered List)
    if (/^[-*]\s/m.test(html)) {
        const lines = html.split('\n');
        let listItems = '';
        
        lines.forEach(line => {
            if (/^[-*]\s/.test(line.trim())) {
                const content = line.trim().substring(2); 
                if (content.trim() !== '') {
                    listItems += `<li>${content}</li>`;
                }
            } else if (line.trim() !== "") {
                listItems += `<li class="list-none pt-2">${line.trim()}</li>`;
            }
        });
        return `<ul class="list-disc pl-4 space-y-1.5 text-xs text-slate-600 mt-2">${listItems}</ul>`;
    }
    
    // 5. 普通文字處理
    return `<p class="text-xs text-slate-500 leading-relaxed mt-1.5">${html.replace(/\n/g, '<br>')}</p>`;
}

function calculateTotalBudget() {
    if (!window.tripData.detail) return;
    const dayKeys = Object.keys(window.tripData.detail);
    
    let grandTotal = 0;
    const categoryTotals = {};
    const jrExpensesByDay = {};

    // 遍歷所有天數計算總額
    dayKeys.forEach(key => {
        const day = window.tripData.detail[key];
        const dailyJrExpenses = [];

        day.timeline.forEach(item => {
            const amt = parseFloat(item.amount) || 0;
            if (amt > 0) {
                grandTotal += amt;
                categoryTotals[item.type] = (categoryTotals[item.type] || 0) + amt;
                
                // 收集交通相關的花費作為明細
                if (['jr', 'train', 'transit', 'bus', 'flight'].includes(item.type)) {
                    dailyJrExpenses.push({ desc: item.event, amount: amt, type: item.type });
                }
            }
        });

        if (dailyJrExpenses.length > 0) {
            jrExpensesByDay[day.dayNum] = dailyJrExpenses;
        }
    });

    // 格式化總預算資料
    const items = Object.entries(categoryTotals).map(([type, sum]) => ({
        title: `${type} 費用`,
        amount: `¥${sum.toLocaleString()}`
    }));

    window.budgetData = {
        items: items,
        total: {
            title: '總預算合計',
            amount: `¥${grandTotal.toLocaleString()}`
        },
        jrExpensesByDay: jrExpensesByDay,
    };
}

// 交通預算速覽渲染邏輯
function renderBudget() {
    if (window.budgetData && window.budgetData.items.length > 0) {
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

        const expenses = window.budgetData.jrExpensesByDay;
        if (!expenses) return;

        document.getElementById('jr-expense-list').innerHTML = Object.keys(expenses).map(day => {
            // 1. 計算該天各 type 的總和
            const dayTotals = {};
            expenses[day].forEach(item => {
                if (item.type) {
                    dayTotals[item.type] = (dayTotals[item.type] || 0) + item.amount;
                }
            });
            
            // 2. 設定排序權重：JR 優先，再來是 BUS，然後是 Train/Transit
            const sortOrder = { 'jr': 1, 'bus': 2, 'train': 3, 'transit': 4, 'flight': 5 };
            
            // 3. 排序並產生分類加總的小標籤 HTML
            const typeBadgesHtml = Object.entries(dayTotals)
                .sort((a, b) => (sortOrder[a[0]] || 99) - (sortOrder[b[0]] || 99))
                .map(([type, sum]) => {
                    return `<span class="px-1.5 py-0.5 bg-black/5 rounded text-[10px] font-bold tracking-wider opacity-80">${type}: ¥${sum.toLocaleString()}</span>`;
                }).join('');

            // 4. 回傳完整的 HTML
            return `
                <div class="mb-4 last:mb-0">
                    <div class="flex items-center font-black text-xs border-b mb-2 pb-1.5 px-2 py-1.5 rounded transition-colors duration-300 ${theme.listHeader}">
                        <span>Day ${day}</span>
                        <!-- 將標籤放在 Day X 的右側 -->
                        <div class="flex flex-wrap gap-1.5 ml-3">
                            ${typeBadgesHtml}
                        </div>
                    </div>
                    <div class="space-y-1">
                        ${expenses[day].map(item => `
                            <div class="flex items-center justify-between text-xs py-1.5 px-2 hover:bg-white rounded transition">
                                <span class="text-slate-600">${item.desc}</span>
                                <span class="font-mono font-bold text-slate-800">¥${item.amount.toLocaleString()}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
        // 渲染右側的 JR Pass 評估
        renderJrPassEval();
    } else {
        const budgetContainer = document.getElementById('budget-container');
        if (budgetContainer) {
            budgetContainer.classList.add('hidden');
        }
    }
}

function renderJrPassEval() {
    const evalContainer = document.getElementById('bottom-jr-pass-eval');
    const passTitle = document.getElementById('jr-pass-title');
    const passIcon = document.getElementById('jr-pass-icon');

    if (!evalContainer || !window.tripData || !window.tripData.metadata.jrPass) return;

    // 取得目前主題設定
    const themeName = window.currentTheme || localStorage.getItem('selected-theme') || 'grayscale';
    const theme = THEMES[themeName];

    // 1. 動態更新外框與標題顏色
    if (passTitle) passTitle.className = `font-bold text-sm mb-3 flex items-center gap-2 transition-colors duration-300 ${theme.passTitle}`;
    if (passIcon) passIcon.className = `w-4 h-4 ${theme.passIcon}`;
    evalContainer.className = `flex flex-col p-4 rounded-xl border flex-grow transition-colors duration-300 ${theme.passBox}`;

    let jrTotal = 0;
    const jrExpenses = window.budgetData?.jrExpensesByDay || {};
    Object.values(jrExpenses).forEach(dayList => {
        dayList.forEach(item => {
            if (item.type === 'jr') {
                jrTotal += item.amount;
            }
        });
    });

    // 2. 產生比價卡片 HTML
    const passComparisonHtml = window.tripData.metadata.jrPass.map(pass => {
        const diff = jrTotal - pass.price;
        const isWorth = diff > 0;
        
        // 虧錢統一用低調的 Slate，省錢則套用華麗的主題色
        const statusColor = isWorth 
            ? theme.passSaveTag 
            : 'text-slate-500 bg-slate-100 border-slate-200';
        const statusText = isWorth 
            ? `省 ¥${diff.toLocaleString()}` 
            : `虧 ¥${Math.abs(diff).toLocaleString()}`;
        
        return `
            <div class="flex items-center justify-between text-sm p-3 rounded-xl border border-slate-100 mt-2 bg-white shadow-sm transition-all duration-300 ${theme.passHover} hover:shadow-md">
                <div>
                    <div class="font-bold text-slate-700 leading-tight">${pass.name}</div>
                    <div class="text-xs text-slate-400 mt-1">售價: ¥${pass.price.toLocaleString()}</div>
                </div>
                <div class="font-black ${statusColor} px-3 py-1.5 rounded-lg whitespace-nowrap ml-2 border transition-colors duration-300">
                    ${statusText}
                </div>
            </div>
        `;
    }).join('');

    // 3. 填入內容
    evalContainer.innerHTML = `
        <div class="flex items-center justify-between bg-white px-4 py-3 rounded-xl border shadow-sm mb-3 transition-colors duration-300 ${theme.passTotalBox}">
            <span class="text-sm font-bold transition-colors duration-300 ${theme.passTotalLabel}">JR 車資</span>
            <span class="text-xl font-black transition-colors duration-300 ${theme.passTotalValue}">¥${jrTotal.toLocaleString()}</span>
        </div>
        <div class="text-xs font-bold mb-1 border-b pb-2 transition-colors duration-300 ${theme.passDivider}">票券比價</div>
        <div class="flex flex-col">
            ${passComparisonHtml}
        </div>
    `;
    
    // 重新初始化 Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons({ root: document.getElementById('jr-pass-wrapper') });
    }
}

function getCardStyle(type) {
    const styles = {
        success: { box: 'bg-emerald-50 border-emerald-200 print:bg-transparent', icon: 'text-emerald-600', title: 'text-emerald-900', defaultIcon: 'check-circle' },
        info:    { box: 'bg-sky-50 border-sky-200 print:bg-transparent', icon: 'text-sky-600', title: 'text-sky-900', defaultIcon: 'info' },
        warning: { box: 'bg-red-50 border-red-400 print:bg-transparent', icon: 'text-red-600', title: 'text-red-900', defaultIcon: 'alert-triangle' },
        danger:  { box: 'bg-red-50 border-red-400 print:bg-transparent', icon: 'text-red-600', title: 'text-red-900', defaultIcon: 'alert-octagon' },
        transit:  { box: 'bg-amber-50 border-amber-200 print:bg-transparent', icon: 'text-amber-600', title: 'text-amber-900', defaultIcon: 'train' },
        scenery:  { box: 'bg-emerald-50 border-emerald-200 print:bg-transparent', icon: 'text-emerald-600', title: 'text-emerald-900', defaultIcon: 'camera' },
        food:     { box: 'bg-rose-50 border-rose-200 print:bg-transparent', icon: 'text-rose-600', title: 'text-rose-900', defaultIcon: 'utensils' },
        shopping: { box: 'bg-purple-50 border-purple-200 print:bg-transparent', icon: 'text-purple-600', title: 'text-purple-900', defaultIcon: 'shopping-bag' },
        culture:  { box: 'bg-indigo-50 border-indigo-200 print:bg-transparent', icon: 'text-indigo-600', title: 'text-indigo-900', defaultIcon: 'landmark' },
    };
    
    // 找不到對應 type 時的預設樣式
    return styles[type] || styles.info;
}

function renderDayBudget(dayData) {
    const card = document.getElementById('day-budget-card');
    const categoryList = document.getElementById('category-list');
    const totalDiv = document.getElementById('day-total');
    
    // 1. 若該天沒有預算資料，隱藏該卡片
    if (!dayData.timeline.some(t => t.amount)) {
        card.classList.add('hidden');
        return;
    }
    card.classList.remove('hidden');

    // 2. 計算總額與類別
    let dailyTotal = 0;
    const categories = {};
    dayData.timeline.forEach(item => {
        const amt = parseFloat(item.amount) || 0;
        if (amt > 0) {
            dailyTotal += amt;
            categories[item.type] = (categories[item.type] || 0) + amt;
        }
    });

    // 3. 渲染類別小標籤
    categoryList.innerHTML = Object.entries(categories).map(([type, sum]) => `
        <span class="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold">
            ${type}: ${sum.toLocaleString()} JPY
        </span>
    `).join('');

    totalDiv.textContent = `本日合計: ${dailyTotal.toLocaleString()} JPY`;
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
    const detailDate = document.getElementById('detail-date');
    if (detailDate) detailDate.textContent = `DAY ${data.dayNum} - ${data.date.split(' ')[0]}`;
    
    const detailTitle = document.getElementById('detail-title');
    if (detailTitle) detailTitle.textContent = data.title;
    
    // 渲染badge
    const badge = document.getElementById('detail-badge');
    if (badge) badge.className = `inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-md transition-colors duration-300 ${theme.detailBadge}`;
    
    const regionTxt = document.getElementById('detail-region-txt');
    if (regionTxt) regionTxt.textContent = data.region;

    // 4. 動態生成提示卡 (Tips)
    const tipsContainer = document.getElementById('tips-container');
    if (tipsContainer) {
        let tips = data.tips || [];

        tipsContainer.innerHTML = tips.map(tip => {
            const style = getCardStyle(tip.type);
            const iconName = tip.icon || style.defaultIcon;
            if (!tip.title) return ''
            return `
                <!-- 🟢 使用跟 Alert 相同的 style.box (實色背景與邊框) -->
                <div class="rounded-xl p-4 border ${style.box}">
                    <div class="flex items-start gap-2 mb-1.5">
                        <i data-lucide="${iconName}" class="w-5 h-5 ${style.icon} shrink-0 mt-0.5"></i>
                        <h4 class="font-bold text-sm ${style.title} tracking-wider leading-snug">${tip.title}</h4>
                    </div>
                    <div class="mt-1">
                        ${parseMarkdownList(tip.desc)}
                    </div>
                </div>
            `;
        }).join('');
        window.initIcons();
    }

    // 5. 渲染精密齒輪時間軸
    const timelineContainer = document.getElementById('detail-timeline');
    timelineContainer.innerHTML = ''; // 清空舊內容

    let dailyTotal = 0;
    const categoryTotals = {}; // 用於統計不同 type 的總額 (例如: jr, bus, hiking)
    data.timeline.forEach(item => {
        const amount = parseFloat(item.amount) || 0; // 確保轉為數字
        dailyTotal += amount;
        if (item.type && amount > 0) {
            categoryTotals[item.type] = (categoryTotals[item.type] || 0) + amount;
        }
        const el = document.createElement('div');
        el.className = 'relative pl-8 transition-all duration-300 hover:translate-x-0.5';

        // 這裡將原本的 item.desc 傳入 parseMarkdownList 進行轉換
        const timeHtml = item.time 
            ? `<span class="whitespace-nowrap text-xs font-black tracking-widest px-2 py-0.5 rounded-md w-max ${theme.timelineTime}">${item.time}</span>` 
            : '';

        el.innerHTML = `
            <div class="absolute -left-3 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-sm z-10 transition-transform duration-300 hover:scale-110 ${getEventBg(item.type)}">
                ${getEventIcon(item.type, item.icon)}
            </div>
            <div>
                <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    ${timeHtml}
                    <h4 class="font-bold text-sm sm:text-base text-slate-800 leading-snug">${item.event}</h4>
                </div>
                ${parseMarkdownList(item.desc)}
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

// ==========================================
// 🖨️ 旅遊手冊列印引擎 (Print Mode)
// ==========================================
/**
 * 生成「行程總覽」表格
 * @param {Array} dayKeys - 包含天數 key 的陣列
 */
function generateOverviewTable(dayKeys) {
    if (!dayKeys || dayKeys.length === 0 || !window.tripData || !window.tripData.detail) return '';

    // 取得 metadata 資料，若無則給予預設值
    const meta = window.tripData.metadata || {};
    const mainTitle = meta.title || '行程總覽 Overview';
    const subTitle = meta.subtitle || '';

    let html = `
    <div class="print-page-break break-after-page p-6">
        <!-- 表頭區塊 -->
        <div class="mb-4">
            <h1 class="text-2xl font-bold text-slate-800">${mainTitle}</h1>
            ${subTitle ? `<div class="text-sm text-slate-500 mt-1">${subTitle}</div>` : ''}
        </div>
        <table class="w-full border-collapse">
            <tbody>
    `;

    dayKeys.forEach(key => {
        const day = window.tripData.detail[key];
        if (!day) return;
        
        // 1. 拆解與解析日期
        let monthStr = "";
        let dayStr = day.date || "未定";
        let dowStr = "";
        let colorClass = "text-slate-700";

        if (day.date) {
            // 根據空白字元拆分字串
            const parts = day.date.trim().split(/\s+/);
            if (parts.length >= 3) {
                monthStr = parts[0];                // 月份 (Oct)
                dayStr = parts[1];                  // 日期 (26)
                // 組合星期並使用 Regex 移除半形與全形括號
                dowStr = parts.slice(2).join(' ').replace(/[()（）]/g, ''); 
            } else if (parts.length === 2) {
                // 處理可能沒有月份的狀況，如 "26 (Mon)"
                dayStr = parts[0];
                dowStr = parts[1].replace(/[()（）]/g, '');
            } else {
                dayStr = day.date.replace(/[()（）]/g, '');
            }
            
            // 判斷週末給予顏色
            if (day.date.toLowerCase().match(/(sat|六)/)) colorClass = "text-green-600";
            if (day.date.toLowerCase().match(/(sun|日)/)) colorClass = "text-red-500";
        }

        // 2. 處理字串 (住宿與地區)
        let hotelText = day.hotel ? day.hotel.replace(/^宿[\s:：]*/, '') : '';
        let regionText = day.region || '';

        // 3. 組合中欄位 (Title + Hotel)
        let centerColumnHTML = `
            <div class="text-lg font-bold text-slate-800 leading-snug">${day.title || ''}</div>
            ${hotelText ? `
            <div class="text-sm text-slate-500 flex items-start gap-1.5 mt-1.5">
                <i data-lucide="bed" class="w-4 h-4 text-slate-400 shrink-0 mt-0.5" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;"></i>
                <span>${hotelText}</span>
            </div>
            ` : ''}
        `;

        // 4. 組合右側欄位 (Region)
        let rightColumnHTML = regionText ? `
            <div class="text-sm font-medium text-slate-500 pt-0.5 leading-snug">
                ${regionText}
            </div>
        ` : '';

        // 5. 組合單列表格
        html += `
            <tr class="border-b border-slate-200 last:border-b-0">
                <!-- 左欄：日期 (將原本的 my-1.5 改為 mb-1.5，移除上方外距以貼齊頂部) -->
                <td class="w-24 py-4 px-2 text-center align-top">
                    <div class="text-3xl font-black leading-none mb-1.5 ${colorClass}">${dayStr}</div>
                    ${dowStr ? `<div class="text-sm font-medium ${colorClass}">${dowStr}</div>` : ''}
                </td>
                
                <!-- 中欄：標題與住宿 -->
                <td class="py-4 px-4 align-top">
                    ${centerColumnHTML}
                </td>
                
                <!-- 右欄：地區 -->
                <td class="w-1/2 py-4 px-2 align-top">
                    ${rightColumnHTML}
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    </div>
    `;

    return html;
}

/**
 * 產生單日列印用的 HTML 結構
 * @param {Object} day - 單日行程資料
 * @returns {string} 組合完成的 HTML 字串
 */
function generatePrintDay(day) {
    if (!day) return '';

    // 1. 產生精密齒輪時間軸
    const timeline = day.timeline || [];
    const timelineHtml = timeline.map((item, i) => {
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
            const style = getCardStyle(tip.type);
            const iconName = tip.icon || style.defaultIcon;
            
            if (!tip.title) return `
            <div class="border ${style.box} p-4 rounded-lg break-inside-avoid" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">
            </div>`;
            
            return `
            <div class="border ${style.box} p-4 rounded-lg break-inside-avoid" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">
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
        
    // 4. 回傳完整單日版面
    return `
        <div class="break-before-page print-page-break p-6">
            <div class="border-b-2 border-slate-800 pb-2 mb-4">
                <span class="text-sm font-black text-slate-400">DAY ${day.dayNum || ''} - ${day.date || ''}</span>
                <div class="flex justify-between items-center mt-1 mb-3">
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
            <div class="p-10 text-center flex flex-col justify-center items-center print-page-break break-after-page" style="height: 100vh;">
                <h1 class="text-5xl font-black mb-6 text-slate-800">${metadata.title || '無標題行程'}</h1>
                <h2 class="text-2xl font-bold text-slate-500 mb-12">${metadata.subtitle || ''}</h2>
                
                ${metadata.guides && metadata.guides.length > 0 ? `
                <div class="border-t-2 border-slate-200 pt-8 mt-8 w-3/4 flex flex-wrap justify-center gap-16">
                    ${metadata.guides.map(guide => `
                        <div class="min-w-[120px]">
                            <h3 class="text-lg font-bold mb-4 text-slate-800">${guide.title || ''}</h3>
                            <ul class="text-left text-sm space-y-2 list-disc pl-6 text-slate-600 inline-block">
                                ${guide.items ? guide.items.map(item => `<li>${item}</li>`).join('') : ''}
                            </ul>
                        </div>
                    `).join('')}
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
            dayKeys.forEach((key) => {
                const day = window.tripData.detail[key];
                if (!day) return;
                
                // ✨ 直接呼叫獨立出來的函式！
                htmlContent += generatePrintDay(day);
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

// 2. 監聽瀏覽器原生的列印事件 (當按下 Command+P 時自動觸發)
window.addEventListener('beforeprint', () => {
    generatePrintContent();
    document.getElementById('print-container').classList.remove('hidden');
});

// 3. 列印結束後自動清理與隱藏
window.addEventListener('afterprint', () => {
    const printContainer = document.getElementById('print-container');
    printContainer.classList.add('hidden');
    printContainer.innerHTML = ''; 
});

// 4. 點擊網頁按鈕時，直接呼叫瀏覽器原生列印即可
window.printItinerary = function() {
    window.print();
};

// 核心啟動函式
function initApp(tripSuccess, fileLoadedName) {
    const dayNav = document.getElementById('day-nav');
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
    
    // 4. 生成左側日程導航按鈕
    const dayKeys = window.tripData.detail ? Object.keys(window.tripData.detail) : [];
    if (dayNav) {
        dayNav.innerHTML = '';
        dayKeys.forEach(key => {
            const day = window.tripData.detail[key];
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

    calculateTotalBudget();
    // 確保預算資料存在才重新渲染，避免初始加載時報錯
    if (window.budgetData) {
        renderBudget();
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

const urlParams = new URLSearchParams(window.location.search);
const rawTripFile = urlParams.get('trip');

// 安全驗證：確保只能載入 .json 結尾且非外部 http 網址的本地檔案
const tripFile = (rawTripFile && rawTripFile.endsWith('.json') && !rawTripFile.startsWith('http')) 
                 ? rawTripFile 
                 : null;

if (tripFile) {
    // 狀況 A：網址有帶 json 檔案參數，從外部檔案讀取
    const tripLoadPromise = loadTripData(tripFile);
    const domReadyPromise = new Promise(resolve => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', resolve);
        } else {
            resolve(); // 若 DOM 已經載入完畢，直接 resolve
        }
    });

    // 🔴 你漏掉了下面這段！沒有這段就不會啟動 initApp
    Promise.all([tripLoadPromise, domReadyPromise])
        .then(([tripSuccess]) => {
            initApp(tripSuccess, tripFile);
        });

} else {
    // 狀況 B：網址沒有參數，從 LocalStorage 讀取已儲存的行程
    document.addEventListener('DOMContentLoaded', () => {
        const currentTripName = localStorage.getItem('current_trip');
        const library = JSON.parse(localStorage.getItem('trip_library') || '{}');
        
        if (currentTripName && library[currentTripName]) {
            window.tripData = library[currentTripName];
            initApp(true, currentTripName); // 只負責渲染畫面
        } else {
            alert("找不到行程，請回到清單頁");
            window.location.href = 'index.html';
        }
    });
}
