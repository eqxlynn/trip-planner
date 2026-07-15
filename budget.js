// budget.js
// ==========================================
// 💰 預算與費用統計模組
// ==========================================

function calculateTotalBudget() {
    if (!window.tripData.detail) return;
    const dayKeys = Object.keys(window.tripData.detail);
    
    let grandTotal = 0;
    const categoryTotals = {};
    const expensesByDay = {};

    // 遍歷所有天數計算總額
    dayKeys.forEach(key => {
        const day = window.tripData.detail[key];
        const dailyExpenses = [];

        day.timeline.forEach(item => {
            const amt = parseFloat(item.amount) || 0;
            if (amt > 0) {
                grandTotal += amt;
                categoryTotals[item.type] = (categoryTotals[item.type] || 0) + amt;
                
                // 收集花費明細
                dailyExpenses.push({ desc: item.event, amount: amt, type: item.type });
            }
        });

        if (dailyExpenses.length > 0) {
            expensesByDay[day.dayNum] = dailyExpenses;
        }
    });

    // 格式化總預算資料 (並強制過濾掉金額 <= 0 的項目)
    const items = Object.entries(categoryTotals)
        .filter(([type, sum]) => sum > 0)
        .map(([type, sum]) => ({
            title: `${type}`,
            amount: `¥${sum.toLocaleString()}`
        }));

    window.budgetData = {
        items: items,
        total: {
            title: '總預算合計',
            amount: `¥${grandTotal.toLocaleString()}`
        },
        expensesByDay: expensesByDay,
    };
}

// 預算速覽渲染邏輯
function renderBudget() {
    if (window.budgetData && window.budgetData.items.length > 0) {
        document.getElementById('budget-section').classList.remove('hidden');
        
        // 從目前主題狀態中抓取最新樣式
        const themeName = window.currentTheme || localStorage.getItem('selected-theme') || 'grayscale';
        const theme = THEMES[themeName];
        
        const container = document.getElementById('budget-cards-container');
        if (!container) return;
        container.innerHTML = '';
        
        // 強制將容器改為「單欄 (grid-cols-1)」與「更緊湊的間距 (gap-2)」
        container.className = 'grid grid-cols-1 gap-2';
        container.innerHTML = '';
        
        // 渲染細分預算項目 (改為左右對齊的清單列)
        window.budgetData.items.forEach(item => {
            const card = document.createElement('div');
            // 加入 flex, items-center, justify-between 讓文字與金額分置左右
            card.className = "bg-slate-50 rounded-xl py-2.5 px-4 border border-slate-100 flex items-center justify-between";
            card.innerHTML = `
                <span class="text-base text-slate-500 font-bold uppercase tracking-wider">${item.title}</span>
                <div class="text-base font-black text-slate-800">${item.amount}</div>
            `;
            container.appendChild(card);
        });

        // 渲染總計卡片 (同步套用主題樣式)
        const totalCard = document.createElement('div');
        // 總計卡片同樣維持左右對齊
        totalCard.className = `${theme.totalCard} rounded-xl py-3 px-4 flex items-center justify-between transition-all duration-300 mt-1`;
        totalCard.innerHTML = `
            <span class="text-base ${theme.totalCardTitle} font-black uppercase tracking-wider">${window.budgetData.total.title}</span>
            <div class="text-xl font-black">${window.budgetData.total.amount}</div>
        `;
        container.appendChild(totalCard);

        const expenses = window.budgetData.expensesByDay;
        if (!expenses) return;

        document.getElementById('expense-list').innerHTML = Object.keys(expenses).map(day => {
            // 1. 計算該天各 type 的總和與每日小計
            const dayTotals = {};
            let dailySubtotal = 0; 
            
            expenses[day].forEach(item => {
                if (item.type) {
                    dayTotals[item.type] = (dayTotals[item.type] || 0) + item.amount;
                    dailySubtotal += item.amount; // 累加當日總金額
                }
            });
            
            // 2. 過濾 0 元項目、依照名稱 (type) 字母順序排序，並產生分類加總的小標籤 HTML
            const typeBadgesHtml = Object.entries(dayTotals)
                .filter(([type, sum]) => sum > 0)
                .sort((a, b) => a[0].localeCompare(b[0])) 
                .map(([type, sum]) => {
                    return `<span class="px-1.5 py-0.5 bg-black/5 rounded text-[10px] font-bold tracking-wider opacity-80">${type}: ¥${sum.toLocaleString()}</span>`;
                }).join('');

            // 4. 建立獨立的小計 HTML，並加上 ml-auto 讓它自動靠最右邊
            const subtotalHtml = dailySubtotal > 0 
                ? `<span class="ml-auto text-[11px] font-black tracking-wider opacity-90">= ¥${dailySubtotal.toLocaleString()}</span>` 
                : '';

            // 5. 回傳完整的 HTML
            return `
                <div class="mb-4 last:mb-0">
                    <div class="flex items-center font-black text-xs border-b mb-2 pb-1.5 px-2 py-1.5 rounded transition-colors duration-300 ${theme.listHeader}">
                        <span>Day ${day}</span>
                        <!-- 將分類標籤放在 Day X 的右側 -->
                        <div class="flex items-center flex-wrap gap-1.5 ml-3">
                            ${typeBadgesHtml}
                        </div>
                        <!-- 放置每日小計 (因為有 ml-auto 會推到最右邊) -->
                        ${subtotalHtml}
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
    } else {
        const budgetContainer = document.getElementById('budget-container');
        if (budgetContainer) {
            budgetContainer.classList.add('hidden');
        }
    }
}

function renderDayBudget(dayData) {
    const card = document.getElementById('day-budget-card');
    const categoryList = document.getElementById('category-list');
    const totalDiv = document.getElementById('day-total');
    
    // 1. 若該天沒有預算資料，隱藏該卡片
    if (!dayData.timeline.some(t => t.amount)) {
        if(card) card.classList.add('hidden');
        return;
    }
    if(card) card.classList.remove('hidden');

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
    if(categoryList) {
        categoryList.innerHTML = Object.entries(categories).map(([type, sum]) => `
            <span class="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold">
                ${type}: ${sum.toLocaleString()} JPY
            </span>
        `).join('');
    }

    if(totalDiv) totalDiv.textContent = `本日合計: ${dailyTotal.toLocaleString()} JPY`;
}
