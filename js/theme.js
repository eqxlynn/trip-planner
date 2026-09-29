/**
 * 主題樣式與事件類別設定。
 */

// 共用灰階配色
const GRAYSCALE_COLORS = {
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
};

/**
 * 主題：配色 + 顯示行為。由 JSON 的 metadata.theme 指定，未指定時為 trip。
 * - subtitleIcon / subtitlePlaceholder：每日 subtitle 的圖示與編輯提示
 * - navIcon / navField / navFallback：左側選單第二行 (顯示哪個欄位、圖示、空值時的文字)
 * - dayKeyFormat：'date' 以日期顯示 detail 的 key；'key' 直接顯示 key 文字 (例如 "B1-L1")
 */
const THEMES = {
    trip: {
        ...GRAYSCALE_COLORS,
        subtitleIcon: 'bed',
        subtitlePlaceholder: '新增住宿',
        navIcon: 'hotel',
        navField: 'subtitle',
        navFallback: '溫暖的家',
        dayKeyFormat: 'date',
    },
    study: {
        ...GRAYSCALE_COLORS,
        subtitleIcon: 'file-text',
        subtitlePlaceholder: '新增講義',
        navIcon: 'book-open',
        navField: 'title',
        navFallback: '',
        dayKeyFormat: 'key',
    },
};
const DEFAULT_THEME = 'trip';
// 舊主題名稱
const THEME_ALIASES = { grayscale: 'trip' };

// 共用色票：box 為背景與邊框、icon 為圖示顏色、title 為標題文字顏色
const COLOR_PALETTE = {
    emerald: { box: 'bg-emerald-50 border-emerald-200', icon: 'text-emerald-600', title: 'text-emerald-900' },
    sky: { box: 'bg-sky-50 border-sky-200', icon: 'text-sky-600', title: 'text-sky-900' },
    amber: { box: 'bg-amber-50 border-amber-200', icon: 'text-amber-600', title: 'text-amber-900' },
    rose: { box: 'bg-rose-50 border-rose-200', icon: 'text-rose-600', title: 'text-rose-900' },
    purple: { box: 'bg-purple-50 border-purple-200', icon: 'text-purple-600', title: 'text-purple-900' },
    orange: { box: 'bg-orange-50 border-orange-200', icon: 'text-orange-600', title: 'text-orange-900' },
    indigo: { box: 'bg-indigo-50 border-indigo-200', icon: 'text-indigo-600', title: 'text-indigo-900' },
    red: { box: 'bg-red-50 border-red-400', icon: 'text-red-600', title: 'text-red-900' },
    slate: { box: 'bg-slate-50 border-slate-200', icon: 'text-slate-600', title: 'text-slate-900' },
    // 白底 + 灰色邊框
    outline: { box: 'bg-white border-slate-300', icon: 'text-slate-500', title: 'text-slate-800' },
    // 完全透明 + 無邊框
    transparent: { box: 'bg-transparent border-transparent', icon: 'text-transparent', title: 'text-transparent' },
    // 白底 + 灰色虛線邊框
    dashed: { box: 'bg-white border-slate-400 border-dashed', icon: 'text-slate-500', title: 'text-slate-800' },
};

// 所有類別設定 (卡片與時間軸事件共用)
// - type 只分大類，決定顏色與預算分類；細節差異以項目的 icon 欄位表示
// - 物件順序即編輯模式 type 下拉選單的順序
// - defaultIcon 可為 Lucide 圖示名稱、自製圖示 (jp-*，見 dom.js 的 CUSTOM_ICONS) 或 emoji
const TYPE_CONFIG = {
    // ---- 基本 ----
    none: { ...COLOR_PALETTE.outline, defaultIcon: 'tag' },
    // 完全透明的類別
    invisiable: { ...COLOR_PALETTE.transparent, defaultIcon: 'message-square' },
    // 單獨行動：虛線外框 (frame 為時間軸項目內容外圍的虛線框；dot 為時間軸圓點樣式，維持實線)
    solo: { ...COLOR_PALETTE.outline, defaultIcon: 'user', frame: 'border border-dashed border-slate-400 rounded-xl px-3 py-2' },

    // ---- 提示卡片 (Guides / Tips) ----
    info: { ...COLOR_PALETTE.sky, defaultIcon: 'info' },
    success: { ...COLOR_PALETTE.emerald, defaultIcon: 'check-circle' },
    warning: { ...COLOR_PALETTE.red, defaultIcon: 'alert-triangle' },

    // ---- 交通 ----
    flight: { ...COLOR_PALETTE.sky, defaultIcon: 'plane' },
    // JR 獨立一類，方便在預算表單獨統計
    jr: { ...COLOR_PALETTE.amber, defaultIcon: 'train' },
    // 交通：私鐵、地鐵、巴士、汽車、船、腳踏車、纜車 (icon 可用 jp-metro、bus、car、ship、bike、cable-car)
    transit: { ...COLOR_PALETTE.amber, defaultIcon: 'train-front' },

    // ---- 住宿 ----
    hotel: { ...COLOR_PALETTE.slate, defaultIcon: 'hotel' },

    // ---- 景點 ----
    // 自然：風景、健行、單車、玩雪、湖泊、公園、溫泉、拍照 (icon 可用 footprints、bike、jp-snowman、waves-horizontal、trees、jp-onsen、camera)
    nature: { ...COLOR_PALETTE.emerald, defaultIcon: 'mountain-snow' },
    // 文化：博物館、城堡、神社 (icon 可用 jp-castle、jp-torii)
    culture: { ...COLOR_PALETTE.indigo, defaultIcon: 'landmark' },
    // 集章：紀念章、風景印、郵局、收集品 (icon 可用 jp-post、jp-genki-badge)
    stamp: { ...COLOR_PALETTE.indigo, defaultIcon: 'stamp' },
    // 祭典：祭典、花火大會 (icon 可用 jp-hanabi)
    festival: { ...COLOR_PALETTE.orange, defaultIcon: 'jp-matsuri' },

    // ---- 消費 ----
    // 美食 (icon 可用 cake-slice、coffee、ice-cream-cone、croissant、beer、fish、beef、
    //       jp-ramen、jp-dango、jp-onigiri)
    food: { ...COLOR_PALETTE.rose, defaultIcon: 'utensils' },
    shopping: { ...COLOR_PALETTE.purple, defaultIcon: 'shopping-bag' },
};

/**
 * 舊 type 別名 (舊資料、雲端或 localStorage 中仍可能使用)，不會出現在下拉選單。
 * 值為字串時僅換成新 type；為物件時同時指定預設圖示，讓舊資料外觀維持不變。
 */
const TYPE_ALIASES = {
    transparent: 'invisiable',
    danger: { type: 'warning', icon: 'alert-octagon' },
    train: { type: 'transit', icon: 'jp-metro' },
    subway: { type: 'transit', icon: 'jp-metro' },
    road: { type: 'transit', icon: 'bus' },
    bus: { type: 'transit', icon: 'bus' },
    car: { type: 'transit', icon: 'car' },
    ship: { type: 'transit', icon: 'ship' },
    ferry: { type: 'transit', icon: 'ship' },
    boat: { type: 'transit', icon: 'ship' },
    bike: { type: 'transit', icon: 'bike' },
    bicycle: { type: 'transit', icon: 'bike' },
    ropeway: { type: 'transit', icon: 'cable-car' },
    'cable-car': { type: 'transit', icon: 'cable-car' },
    scenery: 'nature',
    hiking: { type: 'nature', icon: 'footprints' },
    park: { type: 'nature', icon: 'trees' },
    onsen: { type: 'nature', icon: 'jp-onsen' },
    photo: { type: 'nature', icon: 'camera' },
    snow: { type: 'nature', icon: 'jp-snowman' },
    lake: { type: 'nature', icon: 'waves-horizontal' },
    castle: { type: 'culture', icon: 'jp-castle' },
    shrine: { type: 'culture', icon: 'jp-torii' },
    post: { type: 'stamp', icon: 'jp-post' },
    service: { type: 'stamp', icon: 'jp-post' },
    matsuri: 'festival',
    hanabi: { type: 'festival', icon: 'jp-hanabi' },
    fireworks: { type: 'festival', icon: 'jp-hanabi' },
};

function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

function resolveTypeAlias(type) {
    const alias = hasOwn(TYPE_ALIASES, type) ? TYPE_ALIASES[type] : null;
    if (!alias) return { type, icon: null };
    return typeof alias === 'string' ? { type: alias, icon: null } : alias;
}

/** 將舊 type 轉為目前的 type (預算分類、下拉選單使用) */
function normalizeType(type) {
    return resolveTypeAlias(type).type;
}

function getTypeConfig(type) {
    const { type: key, icon } = resolveTypeAlias(type);
    const config = hasOwn(TYPE_CONFIG, key) ? TYPE_CONFIG[key] : TYPE_CONFIG.none;
    return icon ? { ...config, defaultIcon: icon } : config;
}

// 透明類別：編輯模式下改用 none 樣式顯示，避免看不到
function isInvisibleType(type) {
    return normalizeType(type) === 'invisiable';
}

function getCurrentTheme() {
    return THEMES[window.currentTheme] || THEMES[DEFAULT_THEME];
}

/**
 * 依主題取得 detail key 的顯示資訊 (欄位同 getDateDisplayInfo)。
 * dayKeyFormat 為 'key' 時，"B1-L1" 顯示為上方 "B1"、中間 "L1"，且日曆不可點擊改日期。
 */
function getDayDisplayInfo(dayKey) {
    if (getCurrentTheme().dayKeyFormat !== 'key') return { ...getDateDisplayInfo(dayKey), editable: true };
    const [head, ...rest] = String(dayKey || '').split('-');
    const hasRest = rest.length > 0;
    return {
        startStr: hasRest ? head : '',
        mainStr: hasRest ? rest.join('-') : head,
        endStr: '',
        dowStr: '',
        full: dayKey,
        display: dayKey,
        editable: false,
    };
}

/** 套用主題到頁首與預算區塊 (themeName 通常來自 metadata.theme) */
function setTheme(themeName) {
    const resolved = hasOwn(THEME_ALIASES, themeName) ? THEME_ALIASES[themeName] : themeName;
    const name = THEMES[resolved] ? resolved : DEFAULT_THEME;
    window.currentTheme = name;
    localStorage.setItem(STORAGE_KEYS.THEME, name);

    const theme = THEMES[name];

    const header = document.getElementById('main-header');
    if (header) header.className = `${theme.header} text-white shadow-md transition-all duration-500`;

    const headerIcon = document.getElementById('header-icon');
    if (headerIcon) headerIcon.className = `w-7 h-7 ${theme.headerText}`;

    const walletIcon = document.getElementById('wallet-icon');
    if (walletIcon) walletIcon.className = `w-5 h-5 ${theme.walletIcon}`;
}
