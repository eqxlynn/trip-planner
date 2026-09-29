/**
 * 預算與費用統計。
 */

const CURRENCY_SYMBOL = '¥';

function formatMoney(amount) {
    return `${CURRENCY_SYMBOL}${amount.toLocaleString()}`;
}

/** 彙整所有天數的花費，結果寫入 window.budgetData */
function calculateTotalBudget() {
    const detail = window.tripData?.detail;
    if (!detail) return;

    let grandTotal = 0;
    const categoryTotals = {};
    const expensesByDay = {};

    getSortedDayKeys(detail).forEach(key => {
        const dailyExpenses = [];

        // 子行程 (subEvents，一層) 的金額也計入，排在所屬主行程之後
        const items = (detail[key].timeline || []).flatMap(item => [item, ...(item.subEvents || [])]);
        items.forEach(item => {
            const amount = parseFloat(item.amount) || 0;
            if (amount <= 0) return;

            const type = normalizeType(item.type);
            grandTotal += amount;
            categoryTotals[type] = (categoryTotals[type] || 0) + amount;
            dailyExpenses.push({ desc: item.title || '', amount, type });
        });

        if (dailyExpenses.length > 0) expensesByDay[key] = dailyExpenses;
    });

    window.budgetData = {
        items: Object.entries(categoryTotals)
            .filter(([, sum]) => sum > 0)
            .map(([type, sum]) => ({ title: type, amount: formatMoney(sum) })),
        total: { title: '總預算合計', amount: formatMoney(grandTotal) },
        expensesByDay,
    };
}

function renderBudget() {
    const section = document.getElementById('budget-section');
    const hasData = !!(window.budgetData && window.budgetData.items.length > 0);

    // budget-section 預設為 "hidden lg:flex"，沒有資料時連桌面版也隱藏
    if (section) section.classList.toggle('lg:flex', hasData);
    if (!hasData) return;

    const theme = getCurrentTheme();
    renderBudgetCards(theme);
    renderExpenseList(theme);
}

function renderBudgetCards(theme) {
    const container = document.getElementById('budget-cards-container');
    if (!container) return;

    container.className = 'grid grid-cols-1 gap-2';
    container.innerHTML = '';

    window.budgetData.items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'bg-slate-50 rounded-xl py-2.5 px-4 border border-slate-100 flex items-center justify-between';
        card.innerHTML = `
            <span class="text-base text-slate-500 font-bold uppercase tracking-wider">${item.title}</span>
            <div class="text-base font-black text-slate-800">${item.amount}</div>
        `;
        container.appendChild(card);
    });

    const totalCard = document.createElement('div');
    totalCard.className = `${theme.totalCard} rounded-xl py-3 px-4 flex items-center justify-between transition-all duration-300 mt-1`;
    totalCard.innerHTML = `
        <span class="text-base ${theme.totalCardTitle} font-black uppercase tracking-wider">${window.budgetData.total.title}</span>
        <div class="text-xl font-black">${window.budgetData.total.amount}</div>
    `;
    container.appendChild(totalCard);
}

function renderExpenseList(theme) {
    const listEl = document.getElementById('expense-list');
    const expenses = window.budgetData.expensesByDay;
    if (!listEl || !expenses) return;

    listEl.innerHTML = Object.keys(expenses).map(day => {
        // 該天各類別小計與總額
        const dayTotals = {};
        let dailySubtotal = 0;
        expenses[day].forEach(item => {
            if (!item.type) return;
            dayTotals[item.type] = (dayTotals[item.type] || 0) + item.amount;
            dailySubtotal += item.amount;
        });

        const typeBadgesHtml = Object.entries(dayTotals)
            .filter(([, sum]) => sum > 0)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([type, sum]) => `<span class="px-1.5 py-0.5 bg-black/5 rounded text-[10px] font-bold tracking-wider opacity-80">${type}: ${formatMoney(sum)}</span>`)
            .join('');

        const subtotalHtml = dailySubtotal > 0
            ? `<span class="ml-auto text-[11px] font-black tracking-wider opacity-90">= ${formatMoney(dailySubtotal)}</span>`
            : '';

        const rowsHtml = expenses[day].map(item => `
            <div class="flex items-center justify-between text-xs py-1.5 px-2 hover:bg-white rounded transition">
                <span class="text-slate-600">${item.desc}</span>
                <span class="font-mono font-bold text-slate-800">${formatMoney(item.amount)}</span>
            </div>
        `).join('');

        return `
            <div class="mb-4 last:mb-0">
                <div class="lg:flex items-center font-black text-xs border-b mb-2 pb-1.5 px-2 py-1.5 rounded transition-colors duration-300 ${theme.listHeader}">
                    <span>Day ${day}</span>
                    <div class="flex items-center flex-wrap gap-1.5 ml-3">${typeBadgesHtml}</div>
                    ${subtotalHtml}
                </div>
                <div class="space-y-1">${rowsHtml}</div>
            </div>
        `;
    }).join('');
}
