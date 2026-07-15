// ==========================================
// 🎨 主題樣式設定 (THEMES)
// ==========================================
const THEMES = {
/*
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
*/
    grayscale: {
        header: 'bg-gradient-to-r from-slate-800 via-slate-750 to-gray-700 text-white',
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

// 🎨 1. 定義共用色票 (Color Palette)
// box 對應背景與邊框, icon 對應圖示顏色, title 對應標題文字顏色
const COLOR_PALETTE = {
    emerald: { box: 'bg-emerald-50 border-emerald-200', icon: 'text-emerald-600', title: 'text-emerald-900' },
    sky:     { box: 'bg-sky-50 border-sky-200',         icon: 'text-sky-600',     title: 'text-sky-900' },
    amber:   { box: 'bg-amber-50 border-amber-200',     icon: 'text-amber-600',   title: 'text-amber-900' },
    rose:    { box: 'bg-rose-50 border-rose-200',       icon: 'text-rose-600',    title: 'text-rose-900' },
    purple:  { box: 'bg-purple-50 border-purple-200',   icon: 'text-purple-600',  title: 'text-purple-900' },
    indigo:  { box: 'bg-indigo-50 border-indigo-200',   icon: 'text-indigo-600',  title: 'text-indigo-900' },
    red:     { box: 'bg-red-50 border-red-400',         icon: 'text-red-600',     title: 'text-red-900' },
    slate:   { box: 'bg-slate-50 border-slate-200',     icon: 'text-slate-600',   title: 'text-slate-900' },
    // 👇 新增這組：透明底色 + 灰色邊框
    outline: { box: 'bg-white border-slate-300',  icon: 'text-slate-500',   title: 'text-slate-800' },
    // 👇 新增這組：完全透明 + 無邊框
    transparent: { box: 'bg-transparent border-transparent', icon: 'text-transparent', title: 'text-transparent' }
};

// ⚙️ 2. 統一管理所有類別 (Cards & Events 共用)
const TYPE_CONFIG = {
    none:     { ...COLOR_PALETTE.outline, defaultIcon: 'tag' },
    // 👇 新增這行：完全透明的類別
    invisiable: { ...COLOR_PALETTE.transparent, defaultIcon: 'message-square' },
    // --- 系統卡片類 (Guide / Tips) ---
    success:  { ...COLOR_PALETTE.emerald, defaultIcon: 'check-circle' },
    info:     { ...COLOR_PALETTE.sky,     defaultIcon: 'info' },
    warning:  { ...COLOR_PALETTE.red,     defaultIcon: 'alert-triangle' },
    danger:   { ...COLOR_PALETTE.red,     defaultIcon: 'alert-octagon' },
    
    // --- 行程事件類 (Timeline Events) ---
    flight:   { ...COLOR_PALETTE.sky,     defaultIcon: 'plane' },
    transit:  { ...COLOR_PALETTE.amber,   defaultIcon: 'train' },
    bus:      { ...COLOR_PALETTE.amber,   defaultIcon: 'bus' },
    jr:       { ...COLOR_PALETTE.amber,   defaultIcon: 'train' },
    train:    { ...COLOR_PALETTE.amber,   defaultIcon: 'train' },
    hotel:    { ...COLOR_PALETTE.slate,   defaultIcon: 'hotel' },
    hiking:   { ...COLOR_PALETTE.emerald, defaultIcon: 'footprints' },
    scenery:  { ...COLOR_PALETTE.emerald, defaultIcon: 'camera' },
    food:     { ...COLOR_PALETTE.rose,    defaultIcon: 'utensils' },
    shopping: { ...COLOR_PALETTE.purple,  defaultIcon: 'shopping-bag' },
    culture:  { ...COLOR_PALETTE.indigo,  defaultIcon: 'landmark' },
    stamp:    { ...COLOR_PALETTE.indigo,  defaultIcon: 'stamp' }
};

const THEME_STYLE = {
    // 定義各層級標題
    headingMain: "text-2xl font-black text-slate-900 tracking-wider",
    headingSub: "text-lg font-bold text-slate-800",
    
    // 定義內文與描述
    textNormal: "text-sm text-slate-600 leading-relaxed",
    textSmall: "text-xs text-slate-500",
    
    // 定義卡片外觀與間距
    cardBase: "bg-white rounded-2xl shadow-sm border border-slate-100 p-4 lg:p-5",
    
    // 定義編輯下拉選單
    editInput: "bg-transparent border-b border-slate-300 focus:outline-none focus:border-emerald-500 pb-0.5 text-slate-700",
};

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

    renderBudget();
}
